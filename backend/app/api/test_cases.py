from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from typing import List, Optional
import csv
import io
import json
from app.core.database import get_db
from app.models.models import TestCase, User, Module
from app.schemas.schemas import (
    TestCase as TestCaseSchema,
    TestCaseCreate,
    TestCaseUpdate,
    TestCaseBulkUpdate
)
from app.api.auth import get_current_active_user
from app.services.test_sync import TestCaseSync

router = APIRouter()

def generate_test_id(tag: str, db: Session) -> str:
    """
    Generate next test ID based on tag
    Format: TC_UI_{n}, TC_API_{n}, or TC_HYBRID_{n}
    """
    tag_upper = tag.upper()
    prefix = f"TC_{tag_upper}_"
    
    # Find the highest existing number for this tag
    test_cases = db.query(TestCase).filter(TestCase.test_id.like(f"{prefix}%")).all()
    
    if not test_cases:
        return f"{prefix}1"
    
    # Extract numbers from existing test IDs
    numbers = []
    for tc in test_cases:
        try:
            # Extract number after the prefix
            num_str = tc.test_id.replace(prefix, "")
            numbers.append(int(num_str))
        except ValueError:
            continue
    
    # Return next number
    next_num = max(numbers) + 1 if numbers else 1
    return f"{prefix}{next_num}"

@router.get("/generate-test-id")
def get_next_test_id(
    tag: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Generate the next available test ID for a given tag"""
    if tag not in ['ui', 'api', 'hybrid']:
        raise HTTPException(status_code=400, detail="Invalid tag. Must be ui, api, or hybrid")
    
    next_id = generate_test_id(tag, db)
    return {"test_id": next_id}

@router.get("", response_model=List[TestCaseSchema])
@router.get("/", response_model=List[TestCaseSchema])
def list_test_cases(
    skip: int = 0,
    limit: int = 100,
    module_id: int = None,
    test_type: str = None,
    sub_module: str = None,  # NEW: Filter by sub-module
    feature_section: str = None,  # NEW: Filter by feature/section
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    query = db.query(TestCase)
    
    if module_id:
        query = query.filter(TestCase.module_id == module_id)
    if test_type:
        query = query.filter(TestCase.test_type == test_type)
    if sub_module:
        query = query.filter(TestCase.sub_module == sub_module)
    if feature_section:
        query = query.filter(TestCase.feature_section == feature_section)
    
    test_cases = query.offset(skip).limit(limit).all()
    return test_cases

@router.post("", response_model=TestCaseSchema, status_code=201)
@router.post("/", response_model=TestCaseSchema, status_code=201)
def create_test_case(
    test_case: TestCaseCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    # Auto-generate test_id if not provided
    if not test_case.test_id:
        test_case.test_id = generate_test_id(test_case.tag, db)
    else:
        # Check if provided test_id already exists
        db_test_case = db.query(TestCase).filter(TestCase.test_id == test_case.test_id).first()
        if db_test_case:
            raise HTTPException(status_code=400, detail="Test ID already exists")
    
    # Get module name for file path generation
    module = db.query(Module).filter(Module.id == test_case.module_id).first()
    module_name = module.name if module else "General"
    
    # Create test case in DB
    test_data = test_case.dict()
    db_test_case = TestCase(**test_data, created_by=current_user.id)
    
    # Generate file path and create test file (only for UI and API tests)
    if test_case.test_type.upper() in ['UI', 'API']:
        file_path = TestCaseSync.get_test_file_path(
            test_case.test_type,
            module_name,
            test_case.test_id
        )
        
        if file_path:
            # Create the actual pytest file
            TestCaseSync.create_test_file(
                file_path,
                test_case.test_id,
                test_case.title,
                test_case.description or "",
                test_case.test_type,
                module_name
            )
            db_test_case.automated_script_path = file_path
    
    db.add(db_test_case)
    db.commit()
    db.refresh(db_test_case)
    return db_test_case

@router.post("/bulk-upload")
async def bulk_upload_test_cases(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Bulk upload test cases from CSV file.
    
    CSV Format:
    title,description,test_type,tag,tags,module_id,sub_module,feature_section,automation_status,
    scenario_examples,steps_to_reproduce,expected_result,preconditions,test_data
    
    Note: 
    - test_id will be auto-generated based on tag (ui/api/hybrid)
    - tags field is for additional categorization (e.g., "smoke,regression", "sanity")
    - scenario_examples must be valid JSON: {"columns": ["Amount"], "rows": [["$0"], ["$10"]]}
    """
    if not file.filename.endswith('.csv'):
        raise HTTPException(status_code=400, detail="File must be a CSV")
    
    try:
        # Read CSV file
        contents = await file.read()
        csv_file = io.StringIO(contents.decode('utf-8'))
        csv_reader = csv.DictReader(csv_file)
        
        created_count = 0
        failed_count = 0
        errors = []
        
        for row_num, row in enumerate(csv_reader, start=2):  # Start at 2 (header is row 1)
            try:
                # Validate required fields
                if not row.get('title') or not row.get('title').strip():
                    errors.append(f"Row {row_num}: Title is required")
                    failed_count += 1
                    continue
                
                if not row.get('test_type') or row['test_type'].lower() not in ['manual', 'automated']:
                    errors.append(f"Row {row_num}: test_type must be 'manual' or 'automated'")
                    failed_count += 1
                    continue
                
                if not row.get('tag') or row['tag'].lower() not in ['ui', 'api', 'hybrid']:
                    errors.append(f"Row {row_num}: tag must be 'ui', 'api', or 'hybrid'")
                    failed_count += 1
                    continue
                
                if not row.get('module_id'):
                    errors.append(f"Row {row_num}: module_id is required")
                    failed_count += 1
                    continue
                
                try:
                    module_id = int(row['module_id'])
                except ValueError:
                    errors.append(f"Row {row_num}: module_id must be a number")
                    failed_count += 1
                    continue
                
                # Check if module exists
                module = db.query(Module).filter(Module.id == module_id).first()
                if not module:
                    errors.append(f"Row {row_num}: Module with id {module_id} not found")
                    failed_count += 1
                    continue
                
                # Auto-generate test_id based on tag
                tag = row['tag'].lower()
                test_id = generate_test_id(tag, db)
                
                # Handle automation_status
                automation_status = None
                if row.get('automation_status') and row['automation_status'].strip():
                    if row['automation_status'].lower() in ['working', 'broken']:
                        automation_status = row['automation_status'].lower()
                
                # Handle tags (additional categorization tags like smoke, regression, etc.)
                tags_value = None
                if row.get('tags') and row['tags'].strip():
                    tags_value = row['tags'].strip()
                
                # Handle scenario_examples (JSON format for data-driven testing)
                scenario_examples_value = None
                if row.get('scenario_examples') and row['scenario_examples'].strip():
                    import json
                    try:
                        # Validate JSON format
                        json.loads(row['scenario_examples'].strip())
                        scenario_examples_value = row['scenario_examples'].strip()
                    except json.JSONDecodeError:
                        errors.append(f"Row {row_num}: Invalid JSON format in scenario_examples")
                        failed_count += 1
                        continue
                
                # Create test case
                test_case_data = TestCaseCreate(
                    test_id=test_id,
                    title=row['title'].strip(),
                    description=row.get('description', '').strip() or None,
                    test_type=row['test_type'].lower(),
                    tag=tag,
                    tags=tags_value,
                    module_id=module_id,
                    sub_module=row.get('sub_module', '').strip() or None,
                    feature_section=row.get('feature_section', '').strip() or None,
                    automation_status=automation_status,
                    scenario_examples=scenario_examples_value,
                    steps_to_reproduce=row.get('steps_to_reproduce', '').strip() or None,
                    expected_result=row.get('expected_result', '').strip() or None,
                    preconditions=row.get('preconditions', '').strip() or None,
                    test_data=row.get('test_data', '').strip() or None,
                    automated_script_path=None
                )
                
                # Get module name for file path generation
                module_name = module.name
                
                # Create the database record
                db_test_case = TestCase(**test_case_data.dict())
                
                # Generate file path for automated tests
                if db_test_case.test_type == "automated":
                    file_path = TestCaseSync.get_test_file_path(
                        db_test_case.test_type,
                        module_name,
                        db_test_case.test_id
                    )
                    
                    if file_path:
                        db_test_case.automated_script_path = file_path
                
                db.add(db_test_case)
                db.commit()
                created_count += 1
                
            except Exception as e:
                failed_count += 1
                errors.append(f"Row {row_num}: {str(e)}")
                db.rollback()
                continue
        
        return {
            "message": "Bulk upload completed",
            "created": created_count,
            "failed": failed_count,
            "errors": errors[:10] if errors else []  # Return first 10 errors
        }
        
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to process CSV file: {str(e)}")

@router.post("/bulk-upload-feature")
async def bulk_upload_feature_file(
    file: UploadFile = File(...),
    module_id: int = Form(...),
    sub_module: str = Form(None),
    feature_section: str = Form(None),
    test_type: str = Form("automated"),
    tag: str = Form("ui"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Bulk upload test cases from BDD Feature file.
    
    Supports:
    - Scenarios (converted to individual test cases)
    - Scenario Outlines with Examples (converted to test cases with scenario_examples)
    
    Parameters:
    - module_id: Required. The module ID for all test cases
    - sub_module: Optional. Sub-module name
    - feature_section: Optional. Feature section name
    - test_type: Default 'automated'. Can be 'manual' or 'automated'
    - tag: Default 'ui'. Can be 'ui', 'api', or 'hybrid'
    
    Note: test_id will be auto-generated for each scenario
    """
    from gherkin.parser import Parser
    from gherkin.token_scanner import TokenScanner
    
    if not file.filename.endswith('.feature'):
        raise HTTPException(status_code=400, detail="File must be a .feature file")
    
    if not module_id:
        raise HTTPException(status_code=400, detail="module_id is required")
    
    # Validate module exists
    module = db.query(Module).filter(Module.id == module_id).first()
    if not module:
        raise HTTPException(status_code=404, detail=f"Module with id {module_id} not found")
    
    # Validate test_type and tag
    if test_type.lower() not in ['manual', 'automated']:
        raise HTTPException(status_code=400, detail="test_type must be 'manual' or 'automated'")
    
    if tag.lower() not in ['ui', 'api', 'hybrid']:
        raise HTTPException(status_code=400, detail="tag must be 'ui', 'api', or 'hybrid'")
    
    try:
        # Read feature file
        contents = await file.read()
        feature_text = contents.decode('utf-8')
        
        # Check if file is empty
        if not feature_text or feature_text.strip() == "":
            raise HTTPException(status_code=400, detail="Uploaded feature file is empty")
        
        # Parse feature file
        parser = Parser()
        token_scanner = TokenScanner(feature_text)
        gherkin_document = parser.parse(token_scanner)
        
        created_count = 0
        failed_count = 0
        errors = []
        
        # Get feature
        feature = gherkin_document.get('feature')
        if not feature:
            raise HTTPException(status_code=400, detail="No feature found in file")
        
        feature_name = feature.get('name', 'Unknown Feature')
        # Use provided feature_section, or fall back to feature name from file
        feature_section_to_use = feature_section or feature_name
        
        # Process each child (Scenario or Scenario Outline)
        for child in feature.get('children', []):
            scenario_name = "Unknown"  # Initialize to avoid UnboundLocalError
            try:
                # In the gherkin parser, the scenario IS the child, not nested under it
                if child.get('type') not in ['Scenario', 'ScenarioOutline']:
                    continue
                
                scenario = child  # The child IS the scenario
                scenario_name = scenario.get('name', 'Unnamed Scenario')
                scenario_keyword = scenario.get('keyword', 'Scenario').strip()
                
                # Collect steps
                steps_list = []
                for step in scenario.get('steps', []):
                    keyword = step.get('keyword', '').strip()
                    text = step.get('text', '').strip()
                    steps_list.append(f"{keyword} {text}")
                
                steps_text = '\n'.join(steps_list)
                
                # Check if it's a Scenario Outline with Examples
                examples = scenario.get('examples', [])
                
                if examples and len(examples) > 0:
                    # Scenario Outline with Examples
                    for example_set in examples:
                        # Get table header and rows
                        table_header = example_set.get('tableHeader')
                        table_body = example_set.get('tableBody', [])
                        
                        if not table_header or not table_body:
                            continue
                        
                        # Build scenario_examples JSON
                        columns = [cell.get('value', '') for cell in table_header.get('cells', [])]
                        rows = []
                        for table_row in table_body:
                            row_values = [cell.get('value', '') for cell in table_row.get('cells', [])]
                            rows.append(row_values)
                        
                        scenario_examples_json = {
                            "columns": columns,
                            "rows": rows
                        }
                        
                        # Generate test ID
                        test_id = generate_test_id(tag.lower(), db)
                        
                        # Create test case with scenario_examples
                        test_case_data = TestCaseCreate(
                            test_id=test_id,
                            title=f"{scenario_name}",
                            description=f"Feature: {feature_name}\n\nScenario Outline: {scenario_name}",
                            test_type=test_type.lower(),
                            tag=tag.lower(),
                            tags="bdd,gherkin",
                            module_id=module_id,
                            sub_module=sub_module,
                            feature_section=feature_section_to_use,
                            automation_status='working' if test_type.lower() == 'automated' else None,
                            scenario_examples=json.dumps(scenario_examples_json),
                            steps_to_reproduce=steps_text,
                            expected_result=None,
                            preconditions=None,
                            test_data=None,
                            automated_script_path=None
                        )
                        
                        # Create database record
                        db_test_case = TestCase(**test_case_data.dict())
                        
                        # Generate file path for automated tests
                        if db_test_case.test_type == "automated":
                            file_path = TestCaseSync.get_test_file_path(
                                db_test_case.test_type,
                                module.name,
                                db_test_case.test_id
                            )
                            if file_path:
                                db_test_case.automated_script_path = file_path
                        
                        db.add(db_test_case)
                        db.commit()
                        created_count += 1
                else:
                    # Regular Scenario (no examples)
                    # Generate test ID
                    test_id = generate_test_id(tag.lower(), db)
                    
                    # Create test case
                    test_case_data = TestCaseCreate(
                        test_id=test_id,
                        title=f"{scenario_name}",
                        description=f"Feature: {feature_name}\n\n{scenario_keyword}: {scenario_name}",
                        test_type=test_type.lower(),
                        tag=tag.lower(),
                        tags="bdd,gherkin",
                        module_id=module_id,
                        sub_module=sub_module,
                        feature_section=feature_section_to_use,
                        automation_status='working' if test_type.lower() == 'automated' else None,
                        scenario_examples=None,
                        steps_to_reproduce=steps_text,
                        expected_result=None,
                        preconditions=None,
                        test_data=None,
                        automated_script_path=None
                    )
                    
                    # Create database record
                    db_test_case = TestCase(**test_case_data.dict())
                    
                    # Generate file path for automated tests
                    if db_test_case.test_type == "automated":
                        file_path = TestCaseSync.get_test_file_path(
                            db_test_case.test_type,
                            module.name,
                            db_test_case.test_id
                        )
                        if file_path:
                            db_test_case.automated_script_path = file_path
                    
                    db.add(db_test_case)
                    db.commit()
                    created_count += 1
                    
            except Exception as e:
                failed_count += 1
                errors.append(f"Scenario '{scenario_name}': {str(e)}")
                db.rollback()
                continue
        
        return {
            "message": "Feature file upload completed",
            "created": created_count,
            "failed": failed_count,
            "errors": errors[:10] if errors else []
        }
        
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=400, detail=f"Failed to process feature file: {str(e)}")

@router.get("/by-jira-story")
def get_test_cases_by_jira_story(
    release_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Get test cases grouped by JIRA story for release management tree view
    Returns hierarchical structure: Epic -> Story -> Test Cases
    """
    from collections import defaultdict
    
    # Get all test cases for the release (or all if no release specified)
    query = db.query(TestCase)
    
    if release_id:
        from app.models.models import ReleaseTestCase
        # Filter test cases that are part of the release
        test_case_ids = db.query(ReleaseTestCase.test_case_id).filter(
            ReleaseTestCase.release_id == release_id
        ).all()
        test_case_ids = [tc_id[0] for tc_id in test_case_ids]
        query = query.filter(TestCase.id.in_(test_case_ids))
    
    test_cases = query.all()
    
    # Group test cases by epic and story
    epic_story_map = defaultdict(lambda: defaultdict(list))
    no_story_cases = []
    
    for tc in test_cases:
        if tc.jira_story_id:
            epic_id = tc.jira_epic_id or "No Epic"
            epic_story_map[epic_id][tc.jira_story_id].append({
                "id": tc.id,
                "test_id": tc.test_id,
                "title": tc.title,
                "test_type": tc.test_type.value,
                "tag": tc.tag.value,
                "automation_status": tc.automation_status.value if tc.automation_status else None,
                "module_id": tc.module_id,
                "sub_module": tc.sub_module,
                "feature_section": tc.feature_section
            })
        else:
            no_story_cases.append({
                "id": tc.id,
                "test_id": tc.test_id,
                "title": tc.title,
                "test_type": tc.test_type.value,
                "tag": tc.tag.value,
                "automation_status": tc.automation_status.value if tc.automation_status else None,
                "module_id": tc.module_id,
                "sub_module": tc.sub_module,
                "feature_section": tc.feature_section
            })
    
    # Fetch story titles from jira_stories table
    from app.models.models import JiraStory
    story_ids = [story_id for stories in epic_story_map.values() for story_id in stories.keys()]
    story_details = {}
    if story_ids:
        stories_from_db = db.query(JiraStory).filter(JiraStory.story_id.in_(story_ids)).all()
        story_details = {story.story_id: story.title for story in stories_from_db}
    
    # Convert to list format for frontend
    result = []
    for epic_id, stories in epic_story_map.items():
        epic_node = {
            "id": epic_id,
            "name": epic_id,
            "type": "epic",
            "children": []
        }
        
        for story_id, test_cases_list in stories.items():
            story_node = {
                "id": story_id,
                "name": story_id,
                "title": story_details.get(story_id, ""),  # Add story title
                "type": "story",
                "test_cases": test_cases_list,
                "test_case_count": len(test_cases_list)
            }
            epic_node["children"].append(story_node)
        
        result.append(epic_node)
    
    # Add test cases without JIRA stories
    if no_story_cases:
        result.append({
            "id": "no_story",
            "name": "No JIRA Story",
            "type": "unassigned",
            "test_cases": no_story_cases,
            "test_case_count": len(no_story_cases)
        })
    
    return {
        "view_type": "jira_story",
        "epics": result,
        "total_test_cases": len(test_cases)
    }

@router.put("/bulk-update", response_model=dict)
def bulk_update_test_cases(
    bulk_update: TestCaseBulkUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Bulk update multiple test cases at once.
    Only non-null fields in the request will be updated.
    """
    if not bulk_update.test_case_ids:
        raise HTTPException(status_code=400, detail="No test case IDs provided")
    
    # Get update data, excluding None values and the test_case_ids field
    update_data = bulk_update.dict(exclude_unset=True, exclude={'test_case_ids'})
    update_data = {k: v for k, v in update_data.items() if v is not None}
    
    if not update_data:
        raise HTTPException(status_code=400, detail="No update fields provided")
    
    # Fetch all test cases that match the provided IDs
    test_cases = db.query(TestCase).filter(TestCase.id.in_(bulk_update.test_case_ids)).all()
    
    if not test_cases:
        raise HTTPException(status_code=404, detail="No matching test cases found")
    
    updated_count = 0
    for test_case in test_cases:
        for field, value in update_data.items():
            setattr(test_case, field, value)
        updated_count += 1
    
    db.commit()
    
    return {
        "message": f"Successfully updated {updated_count} test cases",
        "updated_count": updated_count,
        "updated_ids": bulk_update.test_case_ids
    }

@router.get("/{test_case_id}", response_model=TestCaseSchema)
def get_test_case(
    test_case_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    test_case = db.query(TestCase).filter(TestCase.id == test_case_id).first()
    if not test_case:
        raise HTTPException(status_code=404, detail="Test case not found")
    return test_case

@router.put("/{test_case_id}", response_model=TestCaseSchema)
def update_test_case(
    test_case_id: int,
    test_case_update: TestCaseUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    test_case = db.query(TestCase).filter(TestCase.id == test_case_id).first()
    if not test_case:
        raise HTTPException(status_code=404, detail="Test case not found")
    
    update_data = test_case_update.dict(exclude_unset=True)
    
    # If title or description changed, update the test file docstring
    if ('title' in update_data or 'description' in update_data) and test_case.automated_script_path:
        TestCaseSync.update_test_docstring(
            test_case.automated_script_path,
            test_case.test_id,
            update_data.get('title', test_case.title),
            update_data.get('description', test_case.description)
        )
    
    for field, value in update_data.items():
        setattr(test_case, field, value)
    
    db.commit()
    db.refresh(test_case)
    return test_case

@router.delete("/{test_case_id}", status_code=204)
def delete_test_case(
    test_case_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    test_case = db.query(TestCase).filter(TestCase.id == test_case_id).first()
    if not test_case:
        raise HTTPException(status_code=404, detail="Test case not found")
    
    # Delete test method from file if it exists
    if test_case.automated_script_path:
        TestCaseSync.delete_test_method(
            test_case.automated_script_path,
            test_case.test_id
        )
    
    db.delete(test_case)
    db.commit()
    return None

@router.post("/sync-from-files", status_code=200)
def sync_test_cases_from_files(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Scan test_suite directory and sync existing test files with database
    This creates DB entries for tests that exist in files but not in DB
    """
    test_files = TestCaseSync.scan_test_suite()
    synced_count = 0
    
    for test_type, files in test_files.items():
        for file_info in files:
            for method in file_info['test_methods']:
                # Extract test ID from method name or docstring
                method_name = method['method_name']
                docstring = method['docstring']
                
                # Try to find test_id in docstring
                test_id = None
                title = method_name.replace('test_', '').replace('_', ' ').title()
                
                if docstring and 'Test ID:' in docstring:
                    for line in docstring.split('\n'):
                        if 'Test ID:' in line:
                            test_id = line.split('Test ID:')[1].strip()
                            break
                        if 'Title:' in line:
                            title = line.split('Title:')[1].strip()
                
                if not test_id:
                    test_id = method_name.upper().replace('TEST_', 'TC_')
                
                # Check if test case already exists
                existing = db.query(TestCase).filter(TestCase.test_id == test_id).first()
                if not existing:
                    # Create new test case
                    new_test_case = TestCase(
                        test_id=test_id,
                        title=title,
                        description=docstring or "",
                        test_type='UI' if test_type == 'ui_tests' else 'API',
                        module_id=1,  # Default to first module
                        automated_script_path=file_info['file_path'],
                        created_by=current_user.id
                    )
                    db.add(new_test_case)
                    synced_count += 1
    
    db.commit()
    return {"message": f"Synced {synced_count} test cases from files", "count": synced_count}


@router.get("/hierarchy/structure")
def get_hierarchy_structure(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Get hierarchical structure of test cases for dropdown population
    Returns nested structure: Module → Sub-Modules → Features
    
    Example response:
    {
        "Account Payable": {
            "sub_modules": {
                "Suppliers": {
                    "features": ["Supplier Profile", "List View", "Create Form"]
                },
                "Invoices": {
                    "features": ["Invoice Creation", "Invoice Approval"]
                }
            }
        }
    }
    """
    from app.models.models import SubModule as SubModuleModel, Feature as FeatureModel
    
    # Get all modules
    modules = db.query(Module).all()
    
    hierarchy = {}
    
    for module in modules:
        # Get sub-modules from the sub_modules table
        sub_modules_from_table = db.query(SubModuleModel).filter(
            SubModuleModel.module_id == module.id
        ).all()
        
        sub_modules = {}
        
        # Add sub-modules from the sub_modules table
        for sub_module_obj in sub_modules_from_table:
            # Get features from the features table first
            features_from_table = db.query(FeatureModel).filter(
                FeatureModel.sub_module_id == sub_module_obj.id
            ).all()
            
            # Create feature objects with id and name
            features = [{"id": f.id, "name": f.name} for f in features_from_table]
            feature_names = [f.name for f in features_from_table]
            
            # Also check for features in test cases (legacy data)
            features_from_tests = db.query(TestCase.feature_section).filter(
                TestCase.module_id == module.id,
                TestCase.sub_module == sub_module_obj.name,
                TestCase.feature_section.isnot(None)
            ).distinct()
            
            # Add features from test cases that aren't already in the features table
            for (feature_name,) in features_from_tests:
                if feature_name not in feature_names:
                    features.append({"name": feature_name})  # Legacy features without ID
            
            sub_modules[sub_module_obj.name] = {
                "id": sub_module_obj.id,
                "features": features
            }
        
        # Also include sub-modules from test cases that might not be in sub_modules table yet (legacy)
        sub_modules_from_tests = db.query(TestCase.sub_module).filter(
            TestCase.module_id == module.id,
            TestCase.sub_module.isnot(None)
        ).distinct()
        
        for (sub_module_name,) in sub_modules_from_tests:
            if sub_module_name not in sub_modules:
                # Get distinct features for this sub-module from test cases (legacy)
                features_query = db.query(TestCase.feature_section).filter(
                    TestCase.module_id == module.id,
                    TestCase.sub_module == sub_module_name,
                    TestCase.feature_section.isnot(None)
                ).distinct()
                
                features = [{"name": feature} for (feature,) in features_query]
                
                sub_modules[sub_module_name] = {
                    "features": features
                }
        
        hierarchy[module.name] = {
            "module_id": module.id,
            "sub_modules": sub_modules
        }
    
    return hierarchy


@router.get("/hierarchy/options")
def get_hierarchy_options(
    module_id: int = None,
    sub_module: str = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Get available options for cascading dropdowns
    
    If no parameters: Return all modules with their sub-module counts
    If module_id: Return all sub-modules for that module
    If module_id + sub_module: Return all features for that sub-module
    """
    if not module_id:
        # Return all modules with sub-module counts
        from app.models.models import SubModule as SubModuleModel
        
        modules = db.query(Module).all()
        result = []
        for module in modules:
            # Count from sub_modules table
            sub_module_count = db.query(SubModuleModel).filter(
                SubModuleModel.module_id == module.id
            ).count()
            
            # Also count unique sub-modules from test cases not in sub_modules table
            sub_modules_from_tests = db.query(TestCase.sub_module).filter(
                TestCase.module_id == module.id,
                TestCase.sub_module.isnot(None)
            ).distinct().all()
            
            # Get sub-module names from table
            sub_modules_in_table = db.query(SubModuleModel.name).filter(
                SubModuleModel.module_id == module.id
            ).all()
            sub_module_names_in_table = {name for (name,) in sub_modules_in_table}
            
            # Count additional sub-modules from test cases
            additional_count = sum(1 for (sm,) in sub_modules_from_tests if sm not in sub_module_names_in_table)
            
            result.append({
                "id": module.id,
                "name": module.name,
                "sub_module_count": sub_module_count + additional_count
            })
        return result
    
    elif module_id and not sub_module:
        # Return all sub-modules for this module from sub_modules table
        from app.models.models import SubModule as SubModuleModel
        
        sub_modules_from_table = db.query(SubModuleModel).filter(
            SubModuleModel.module_id == module_id
        ).all()
        
        result = []
        
        # Add sub-modules from the sub_modules table
        from app.models.models import Feature as FeatureModel
        
        for sub_mod_obj in sub_modules_from_table:
            # Get feature count from features table
            feature_count_from_table = db.query(FeatureModel).filter(
                FeatureModel.sub_module_id == sub_mod_obj.id
            ).count()
            
            # Also count features in test cases (legacy)
            feature_count_from_tests = db.query(TestCase.feature_section).filter(
                TestCase.module_id == module_id,
                TestCase.sub_module == sub_mod_obj.name,
                TestCase.feature_section.isnot(None)
            ).distinct().count()
            
            # Total is the max of both (to avoid double counting)
            feature_count = max(feature_count_from_table, feature_count_from_tests)
            
            result.append({
                "id": sub_mod_obj.id,
                "name": sub_mod_obj.name,
                "description": sub_mod_obj.description,
                "feature_count": feature_count
            })
        
        # Also include sub-modules from test cases that might not be in sub_modules table
        sub_modules_from_tests = db.query(TestCase.sub_module).filter(
            TestCase.module_id == module_id,
            TestCase.sub_module.isnot(None)
        ).distinct().all()
        
        existing_names = {sm["name"] for sm in result}
        
        for (sub_mod,) in sub_modules_from_tests:
            if sub_mod not in existing_names:
                feature_count = db.query(TestCase.feature_section).filter(
                    TestCase.module_id == module_id,
                    TestCase.sub_module == sub_mod,
                    TestCase.feature_section.isnot(None)
                ).distinct().count()
                
                result.append({
                    "name": sub_mod,
                    "feature_count": feature_count
                })
        
        return result
    
    else:
        # Return all features for this sub-module
        from app.models.models import SubModule as SubModuleModel, Feature as FeatureModel
        
        # First, get the sub_module_id from the sub_modules table
        sub_module_obj = db.query(SubModuleModel).filter(
            SubModuleModel.module_id == module_id,
            SubModuleModel.name == sub_module
        ).first()
        
        result = []
        
        if sub_module_obj:
            # Get features from the features table
            features_from_table = db.query(FeatureModel).filter(
                FeatureModel.sub_module_id == sub_module_obj.id
            ).all()
            
            for feature_obj in features_from_table:
                test_count = db.query(TestCase).filter(
                    TestCase.module_id == module_id,
                    TestCase.sub_module == sub_module,
                    TestCase.feature_section == feature_obj.name
                ).count()
                
                result.append({
                    "name": feature_obj.name,
                    "test_count": test_count
                })
        
        # Also check for features in test cases (legacy data)
        features_from_tests = db.query(TestCase.feature_section).filter(
            TestCase.module_id == module_id,
            TestCase.sub_module == sub_module,
            TestCase.feature_section.isnot(None)
        ).distinct().all()
        
        # Add features from test cases that aren't already in result
        existing_feature_names = {f["name"] for f in result}
        
        for (feature_name,) in features_from_tests:
            if feature_name not in existing_feature_names:
                test_count = db.query(TestCase).filter(
                    TestCase.module_id == module_id,
                    TestCase.sub_module == sub_module,
                    TestCase.feature_section == feature_name
                ).count()
                
                result.append({
                    "name": feature_name,
                    "test_count": test_count
                })
        
        return result


@router.delete("/feature")
def delete_feature(
    module_id: int,
    sub_module: str,
    feature_section: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Delete a feature by setting feature_section to NULL for all matching test cases
    """
    # Update all test cases with this feature to set feature_section to NULL
    test_cases = db.query(TestCase).filter(
        TestCase.module_id == module_id,
        TestCase.sub_module == sub_module,
        TestCase.feature_section == feature_section
    ).all()
    
    updated_count = 0
    for test_case in test_cases:
        test_case.feature_section = None
        updated_count += 1
    
    db.commit()
    
    return {
        "message": f"Feature '{feature_section}' deleted successfully",
        "updated_test_cases": updated_count
    }
