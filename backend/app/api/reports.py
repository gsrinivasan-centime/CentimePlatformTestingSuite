from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List
from datetime import datetime
from app.core.database import get_db
from app.models.models import (
    TestExecution, TestCase, Module, Release, User, TestStatus, JiraDefect, JiraStory
)
from app.schemas.schemas import ReleaseReport, ModuleTestReport
from app.api.auth import get_current_active_user
from app.models.models import ReleaseTestCase, SubModule, Feature, ExecutionStatus
from reportlab.lib.pagesizes import letter, A4
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, PageBreak
from reportlab.lib.enums import TA_CENTER, TA_LEFT
import os

router = APIRouter()

@router.get("/release/{release_id}", response_model=ReleaseReport)
def get_release_report(
    release_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Generate release test report data"""
    release = db.query(Release).filter(Release.id == release_id).first()
    if not release:
        raise HTTPException(status_code=404, detail="Release not found")
    
    # Get all modules
    modules = db.query(Module).all()
    
    # Get all test cases for this release
    executions = db.query(TestExecution).filter(
        TestExecution.release_id == release_id
    ).all()
    
    # Calculate module-wise statistics
    module_reports = []
    total_executed = 0
    total_passed = 0
    total_failed = 0
    total_pending = 0
    total_skipped = 0
    modules_tested = 0
    
    for module in modules:
        module_test_cases = db.query(TestCase).filter(TestCase.module_id == module.id).all()
        module_executions = [e for e in executions if e.test_case.module_id == module.id]
        
        total_tests = len(module_test_cases)
        passed = len([e for e in module_executions if e.status == TestStatus.PASS])
        failed = len([e for e in module_executions if e.status == TestStatus.FAIL])
        pending = len([e for e in module_executions if e.status == TestStatus.PENDING])
        skipped = len([e for e in module_executions if e.status == TestStatus.SKIPPED])
        
        pass_percentage = (passed / total_tests * 100) if total_tests > 0 else 0
        
        if len(module_executions) > 0:
            modules_tested += 1
        
        total_executed += len(module_executions)
        total_passed += passed
        total_failed += failed
        total_pending += pending
        total_skipped += skipped
        
        module_reports.append(ModuleTestReport(
            module_name=module.name,
            total_tests=total_tests,
            passed=passed,
            failed=failed,
            pending=pending,
            skipped=skipped,
            pass_percentage=round(pass_percentage, 2)
        ))
    
    total_test_cases = db.query(TestCase).count()
    overall_pass_percentage = (total_passed / total_executed * 100) if total_executed > 0 else 0
    
    return ReleaseReport(
        release_version=release.version,
        release_name=release.name,
        total_modules=len(modules),
        modules_tested=modules_tested,
        modules_not_tested=len(modules) - modules_tested,
        total_test_cases=total_test_cases,
        executed_test_cases=total_executed,
        passed=total_passed,
        failed=total_failed,
        pending=total_pending,
        skipped=total_skipped,
        pass_percentage=round(overall_pass_percentage, 2),
        module_reports=module_reports,
        generated_at=datetime.utcnow()
    )

@router.get("/pdf/{release_id}")
def generate_pdf_report(
    release_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Generate and download PDF report for a release matching the UI summary"""
    # Get the same data as the summary endpoint
    data = get_release_summary(release_id, None, db, current_user)
    
    # Create reports directory if it doesn't exist
    os.makedirs("reports", exist_ok=True)
    
    filename = f"reports/release_{data['release_version']}_report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.pdf"
    
    # Create PDF with tighter margins
    doc = SimpleDocTemplate(
        filename, 
        pagesize=A4,
        leftMargin=0.5*inch,
        rightMargin=0.5*inch,
        topMargin=0.6*inch,
        bottomMargin=0.6*inch
    )
    elements = []
    
    # Styles - more compact and professional
    styles = getSampleStyleSheet()
    title_style = ParagraphStyle(
        'CustomTitle',
        parent=styles['Heading1'],
        fontSize=18,
        textColor=colors.HexColor('#1976d2'),
        spaceAfter=8,
        alignment=TA_CENTER,
        fontName='Helvetica-Bold'
    )
    
    heading_style = ParagraphStyle(
        'CustomHeading',
        parent=styles['Heading2'],
        fontSize=12,
        textColor=colors.HexColor('#1976d2'),
        spaceAfter=6,
        spaceBefore=8,
        fontName='Helvetica-Bold'
    )
    
    # Title
    elements.append(Paragraph(f"Test Execution Report - Release {data['release_version']}", title_style))
    if data['release_name']:
        subtitle_style = ParagraphStyle('Subtitle', parent=styles['Normal'], fontSize=10, 
                                        textColor=colors.HexColor('#666'), alignment=TA_CENTER, spaceAfter=6)
        elements.append(Paragraph(data['release_name'], subtitle_style))
    elements.append(Spacer(1, 8))
    
    # Release Information - more compact
    info_text = f"<b>Generated:</b> {datetime.now().strftime('%Y-%m-%d %H:%M')} | <b>By:</b> {current_user.full_name or current_user.email}"
    info_style = ParagraphStyle('Info', parent=styles['Normal'], fontSize=8, textColor=colors.grey, alignment=TA_CENTER)
    elements.append(Paragraph(info_text, info_style))
    elements.append(Spacer(1, 10))
    
    # Executive Summary - compact two-column layout
    elements.append(Paragraph("Executive Summary", heading_style))
    elements.append(Spacer(1, 4))
    
    pass_rate = (data['passed_tests'] / data['total_tests'] * 100) if data['total_tests'] > 0 else 0
    
    # Two-column layout for better space utilization
    summary_stats = [
        ["Total Tests", str(data['total_tests']), "Pass Rate", f"{pass_rate:.1f}%"],
        ["Passed", str(data['passed_tests']), "Failed", str(data['failed_tests'])],
        ["Blocked", str(data['blocked_tests']), "In Progress", str(data['in_progress_tests'])],
        ["Not Started", str(data['not_started_tests']), "Skipped", str(data['skipped_tests'])],
    ]
    
    summary_table = Table(summary_stats, colWidths=[1.8*inch, 1.1*inch, 1.8*inch, 1.1*inch])
    summary_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (1, 0), colors.HexColor('#e3f2fd')),
        ('BACKGROUND', (2, 0), (3, 0), colors.HexColor('#c8e6c9')),
        ('TEXTCOLOR', (0, 0), (-1, -1), colors.HexColor('#333')),
        ('ALIGN', (0, 0), (0, -1), 'LEFT'),
        ('ALIGN', (1, 0), (-1, -1), 'CENTER'),
        ('FONTNAME', (0, 0), (-1, -1), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 9),
        ('TOPPADDING', (0, 0), (-1, -1), 5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
        ('BOX', (0, 0), (1, -1), 1, colors.HexColor('#1976d2')),
        ('BOX', (2, 0), (3, -1), 1, colors.HexColor('#4caf50')),
    ]))
    elements.append(summary_table)
    elements.append(Spacer(1, 10))
    
    # Module-wise Report - compact
    elements.append(Paragraph("Module-wise Test Execution", heading_style))
    elements.append(Spacer(1, 4))
    
    module_data = [["Module", "Total", "Passed", "Failed", "Blocked", "Progress", "Pending", "Pass %"]]
    
    for module in data['module_summary']:
        pass_pct = (module['passed'] / module['total'] * 100) if module['total'] > 0 else 0
        module_name = module['module_name'][:30] + "..." if len(module['module_name']) > 30 else module['module_name']
        module_data.append([
            module_name,
            str(module['total']),
            str(module['passed']),
            str(module['failed']),
            str(module['blocked']),
            str(module['in_progress']),
            str(module['not_started']),
            f"{pass_pct:.0f}%"
        ])
    
    module_table = Table(module_data, colWidths=[2.2*inch, 0.5*inch, 0.5*inch, 0.5*inch, 0.5*inch, 0.6*inch, 0.6*inch, 0.5*inch])
    module_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#1976d2')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('ALIGN', (0, 0), (0, -1), 'LEFT'),
        ('ALIGN', (1, 0), (-1, -1), 'CENTER'),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 8),
        ('FONTSIZE', (0, 1), (-1, -1), 7),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#f5f5f5')]),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
    ]))
    elements.append(module_table)
    elements.append(Spacer(1, 12))
    
    # Detailed Test Cases by Module - compact
    elements.append(Paragraph("Detailed Test Cases", heading_style))
    elements.append(Spacer(1, 4))
    
    subhead_style = ParagraphStyle('SubHead', parent=styles['Heading3'], fontSize=10, 
                                   textColor=colors.HexColor('#333'), spaceAfter=3, spaceBefore=5)
    submod_style = ParagraphStyle('SubMod', parent=styles['Normal'], fontSize=8, 
                                  textColor=colors.HexColor('#666'), leftIndent=10, spaceAfter=2)
    
    for module in data['module_summary']:
        # Module Header - compact
        elements.append(Paragraph(f"<b>{module['module_name']}</b> ({module['total']} tests)", subhead_style))
        
        for sub_module in module.get('sub_modules', []):
            # Sub-Module Header - minimal
            elements.append(Paragraph(f"• {sub_module['name']} ({sub_module['total']} tests)", submod_style))
            
            for feature in sub_module.get('features', []):
                # Feature inline with test table
                if feature.get('test_cases'):
                    test_data = [["Test ID", "Title", "Story", "Type", "Priority", "Status"]]
                    
                    for tc in feature['test_cases']:
                        title_text = tc['title'][:35] + "..." if len(tc['title']) > 35 else tc['title']
                        story_id = tc.get('jira_story', {}).get('story_id', 'N/A') if tc.get('jira_story') else 'N/A'
                        status_short = tc['execution_status'].replace('_', ' ').replace('NOT STARTED', 'PENDING')
                        priority = tc.get('priority') or 'N/A'
                        test_data.append([
                            tc['test_id'],
                            title_text,
                            story_id[:12] if len(story_id) > 12 else story_id,
                            tc['test_type'][:4].upper() if len(tc['test_type']) > 4 else tc['test_type'].upper(),
                            priority[:3] if len(priority) > 3 else priority,
                            status_short[:10] if len(status_short) > 10 else status_short
                        ])
                    
                    test_table = Table(test_data, colWidths=[0.6*inch, 2.3*inch, 0.7*inch, 0.5*inch, 0.5*inch, 0.8*inch])
                    test_table.setStyle(TableStyle([
                        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#e3f2fd')),
                        ('TEXTCOLOR', (0, 0), (-1, -1), colors.black),
                        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
                        ('ALIGN', (3, 0), (-1, -1), 'CENTER'),
                        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                        ('FONTSIZE', (0, 0), (-1, 0), 7),
                        ('FONTSIZE', (0, 1), (-1, -1), 6),
                        ('TOPPADDING', (0, 0), (-1, -1), 3),
                        ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
                        ('GRID', (0, 0), (-1, -1), 0.25, colors.HexColor('#ddd')),
                    ]))
                    elements.append(test_table)
                    elements.append(Spacer(1, 5))
    
    # Story-wise Test Coverage Section - compact
    if data.get('story_summary') and len(data['story_summary']) > 0:
        elements.append(Spacer(1, 12))
        elements.append(Paragraph("User Story Test Coverage", heading_style))
        elements.append(Spacer(1, 4))
        
        story_data = [["Story ID", "Title", "Epic", "Total", "Pass", "Fail", "Block", "Prog", "Pass %"]]
        for story in data['story_summary']:
            story_title = story['story_title'][:42] + "..." if len(story['story_title']) > 42 else story['story_title']
            epic_id = story.get('epic_id') or 'N/A'
            story_data.append([
                story['story_id'][:12] if len(story['story_id']) > 12 else story['story_id'],
                story_title,
                epic_id[:10] if len(epic_id) > 10 else epic_id,
                str(story['total']),
                str(story['passed']),
                str(story['failed']),
                str(story['blocked']),
                str(story['in_progress']),
                f"{story['pass_percentage']:.0f}%"
            ])
        
        story_table = Table(story_data, colWidths=[0.75*inch, 2.3*inch, 0.6*inch, 0.4*inch, 0.4*inch, 0.4*inch, 0.4*inch, 0.4*inch, 0.5*inch])
        story_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#1976d2')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
            ('ALIGN', (0, 0), (1, -1), 'LEFT'),
            ('ALIGN', (2, 0), (-1, -1), 'CENTER'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 7),
            ('FONTSIZE', (0, 1), (-1, -1), 6),
            ('TOPPADDING', (0, 0), (-1, -1), 3),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
            ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#f5f5f5')]),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
        ]))
        elements.append(story_table)
        elements.append(Spacer(1, 8))
    
    # Failed Tests Section - compact with red theme
    if data.get('failed_test_details') and len(data['failed_test_details']) > 0:
        elements.append(Spacer(1, 12))
        elements.append(Paragraph("Failed Test Cases", heading_style))
        elements.append(Spacer(1, 4))
        
        failed_data = [["Test ID", "Title", "Story", "Module", "Sub-Module", "Bugs"]]
        for failed_test in data['failed_test_details']:
            story_id = failed_test.get('jira_story', {}).get('story_id', 'N/A') if failed_test.get('jira_story') else 'N/A'
            bug_ids = failed_test.get('bug_ids') or 'None'
            test_case_id = failed_test['test_case_id']
            failed_data.append([
                test_case_id[:10] if len(test_case_id) > 10 else test_case_id,
                failed_test['title'][:30] + "..." if len(failed_test['title']) > 30 else failed_test['title'],
                story_id[:10] if len(story_id) > 10 else story_id,
                failed_test['module_name'][:18] + "..." if len(failed_test['module_name']) > 18 else failed_test['module_name'],
                (failed_test.get('sub_module', 'N/A')[:15] + "...") if (failed_test.get('sub_module') and len(failed_test.get('sub_module', '')) > 15) else failed_test.get('sub_module', 'N/A'),
                bug_ids[:10] if len(bug_ids) > 10 else bug_ids
            ])
        
        failed_table = Table(failed_data, colWidths=[0.65*inch, 2*inch, 0.65*inch, 1.3*inch, 1.1*inch, 0.65*inch])
        failed_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#d32f2f')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 7),
            ('FONTSIZE', (0, 1), (-1, -1), 6),
            ('TOPPADDING', (0, 0), (-1, -1), 3),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
            ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.HexColor('#ffebee'), colors.white]),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
        ]))
        elements.append(failed_table)
    
    # Build PDF
    doc.build(elements)
    
    return FileResponse(filename, media_type='application/pdf', filename=os.path.basename(filename))


@router.get("/summary")
def get_release_summary(
    release_id: int,
    module_id: int = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get comprehensive test case summary for a release with module-wise breakdown"""
    
    # Verify release exists
    release = db.query(Release).filter(Release.id == release_id).first()
    if not release:
        raise HTTPException(status_code=404, detail="Release not found")
    
    # Query release test cases
    query = db.query(ReleaseTestCase).filter(ReleaseTestCase.release_id == release_id)
    
    if module_id:
        query = query.filter(ReleaseTestCase.module_id == module_id)
    
    release_test_cases = query.all()
    
    # Calculate overall statistics
    total_tests = len(release_test_cases)
    passed_tests = len([tc for tc in release_test_cases if tc.execution_status == ExecutionStatus.PASSED])
    failed_tests = len([tc for tc in release_test_cases if tc.execution_status == ExecutionStatus.FAILED])
    blocked_tests = len([tc for tc in release_test_cases if tc.execution_status == ExecutionStatus.BLOCKED])
    skipped_tests = len([tc for tc in release_test_cases if tc.execution_status == ExecutionStatus.SKIPPED])
    in_progress_tests = len([tc for tc in release_test_cases if tc.execution_status == ExecutionStatus.IN_PROGRESS])
    not_started_tests = len([tc for tc in release_test_cases if tc.execution_status == ExecutionStatus.NOT_STARTED])
    
    # Group by module
    modules_data = {}
    for rtc in release_test_cases:
        module_id = rtc.module_id
        if module_id not in modules_data:
            modules_data[module_id] = {
                'module_id': module_id,
                'module_name': rtc.module.name if rtc.module else 'Unknown',
                'total': 0,
                'passed': 0,
                'failed': 0,
                'blocked': 0,
                'skipped': 0,
                'in_progress': 0,
                'not_started': 0,
                'sub_modules': {}
            }
        
        modules_data[module_id]['total'] += 1
        
        if rtc.execution_status == ExecutionStatus.PASSED:
            modules_data[module_id]['passed'] += 1
        elif rtc.execution_status == ExecutionStatus.FAILED:
            modules_data[module_id]['failed'] += 1
        elif rtc.execution_status == ExecutionStatus.BLOCKED:
            modules_data[module_id]['blocked'] += 1
        elif rtc.execution_status == ExecutionStatus.SKIPPED:
            modules_data[module_id]['skipped'] += 1
        elif rtc.execution_status == ExecutionStatus.IN_PROGRESS:
            modules_data[module_id]['in_progress'] += 1
        elif rtc.execution_status == ExecutionStatus.NOT_STARTED:
            modules_data[module_id]['not_started'] += 1
        
        # Group by sub-module within module
        sub_module_name = rtc.sub_module.name if rtc.sub_module else 'Uncategorized'
        if sub_module_name not in modules_data[module_id]['sub_modules']:
            modules_data[module_id]['sub_modules'][sub_module_name] = {
                'name': sub_module_name,
                'total': 0,
                'passed': 0,
                'failed': 0,
                'blocked': 0,
                'skipped': 0,
                'in_progress': 0,
                'not_started': 0,
                'features': {}
            }
        
        modules_data[module_id]['sub_modules'][sub_module_name]['total'] += 1
        
        if rtc.execution_status == ExecutionStatus.PASSED:
            modules_data[module_id]['sub_modules'][sub_module_name]['passed'] += 1
        elif rtc.execution_status == ExecutionStatus.FAILED:
            modules_data[module_id]['sub_modules'][sub_module_name]['failed'] += 1
        elif rtc.execution_status == ExecutionStatus.BLOCKED:
            modules_data[module_id]['sub_modules'][sub_module_name]['blocked'] += 1
        elif rtc.execution_status == ExecutionStatus.SKIPPED:
            modules_data[module_id]['sub_modules'][sub_module_name]['skipped'] += 1
        elif rtc.execution_status == ExecutionStatus.IN_PROGRESS:
            modules_data[module_id]['sub_modules'][sub_module_name]['in_progress'] += 1
        elif rtc.execution_status == ExecutionStatus.NOT_STARTED:
            modules_data[module_id]['sub_modules'][sub_module_name]['not_started'] += 1
        
        # Group by feature within sub-module
        feature_name = rtc.feature.name if rtc.feature else 'No Feature'
        if feature_name not in modules_data[module_id]['sub_modules'][sub_module_name]['features']:
            modules_data[module_id]['sub_modules'][sub_module_name]['features'][feature_name] = {
                'name': feature_name,
                'test_cases': []
            }
        
        # Get JIRA Story information if linked
        jira_story_info = None
        if rtc.test_case.jira_story_id:
            story = db.query(JiraStory).filter(JiraStory.story_id == rtc.test_case.jira_story_id).first()
            if story:
                jira_story_info = {
                    'story_id': story.story_id,
                    'title': story.title,
                    'epic_id': story.epic_id,
                    'status': story.status,
                    'priority': story.priority,
                    'release': story.release
                }
        
        # Add test case details
        modules_data[module_id]['sub_modules'][sub_module_name]['features'][feature_name]['test_cases'].append({
            'id': rtc.test_case.id,
            'test_id': rtc.test_case.test_id,
            'title': rtc.test_case.title,
            'test_type': rtc.test_case.test_type.value,
            'priority': rtc.priority,
            'execution_status': rtc.execution_status.value,
            'executed_by': rtc.executed_by_id,
            'execution_date': rtc.execution_date.isoformat() if rtc.execution_date else None,
            'comments': rtc.comments,
            'bug_ids': rtc.bug_ids,
            'jira_story': jira_story_info
        })
    
    # Convert nested dictionaries to lists for easier frontend consumption
    module_summary = []
    for module_id, module_data in modules_data.items():
        sub_modules_list = []
        for sub_module_name, sub_module_data in module_data['sub_modules'].items():
            features_list = []
            for feature_name, feature_data in sub_module_data['features'].items():
                features_list.append({
                    'name': feature_name,
                    'test_cases': feature_data['test_cases']
                })
            
            sub_modules_list.append({
                'name': sub_module_data['name'],
                'total': sub_module_data['total'],
                'passed': sub_module_data['passed'],
                'failed': sub_module_data['failed'],
                'blocked': sub_module_data['blocked'],
                'skipped': sub_module_data['skipped'],
                'in_progress': sub_module_data['in_progress'],
                'not_started': sub_module_data['not_started'],
                'features': features_list
            })
        
        module_summary.append({
            'module_id': module_data['module_id'],
            'module_name': module_data['module_name'],
            'total': module_data['total'],
            'passed': module_data['passed'],
            'failed': module_data['failed'],
            'blocked': module_data['blocked'],
            'skipped': module_data['skipped'],
            'in_progress': module_data['in_progress'],
            'not_started': module_data['not_started'],
            'sub_modules': sub_modules_list
        })
    
    # Get failed test case details
    failed_test_details = []
    for rtc in release_test_cases:
        if rtc.execution_status == ExecutionStatus.FAILED:
            # Get JIRA Story information if linked
            jira_story_info = None
            if rtc.test_case.jira_story_id:
                story = db.query(JiraStory).filter(JiraStory.story_id == rtc.test_case.jira_story_id).first()
                if story:
                    jira_story_info = {
                        'story_id': story.story_id,
                        'title': story.title,
                        'status': story.status
                    }
            
            failed_test_details.append({
                'test_case_id': rtc.test_case.test_id,
                'title': rtc.test_case.title,
                'module_name': rtc.module.name if rtc.module else 'Unknown',
                'sub_module': rtc.sub_module.name if rtc.sub_module else 'Uncategorized',
                'error_message': rtc.comments,
                'bug_ids': rtc.bug_ids,
                'jira_story': jira_story_info
            })
    
    # Generate story-wise summary
    story_summary = {}
    for rtc in release_test_cases:
        if rtc.test_case.jira_story_id:
            story_id = rtc.test_case.jira_story_id
            if story_id not in story_summary:
                story = db.query(JiraStory).filter(JiraStory.story_id == story_id).first()
                story_summary[story_id] = {
                    'story_id': story_id,
                    'story_title': story.title if story else 'Unknown',
                    'epic_id': story.epic_id if story else None,
                    'story_status': story.status if story else 'Unknown',
                    'story_priority': story.priority if story else None,
                    'release': story.release if story else None,
                    'total': 0,
                    'passed': 0,
                    'failed': 0,
                    'blocked': 0,
                    'skipped': 0,
                    'in_progress': 0,
                    'not_started': 0
                }
            
            story_summary[story_id]['total'] += 1
            
            if rtc.execution_status == ExecutionStatus.PASSED:
                story_summary[story_id]['passed'] += 1
            elif rtc.execution_status == ExecutionStatus.FAILED:
                story_summary[story_id]['failed'] += 1
            elif rtc.execution_status == ExecutionStatus.BLOCKED:
                story_summary[story_id]['blocked'] += 1
            elif rtc.execution_status == ExecutionStatus.SKIPPED:
                story_summary[story_id]['skipped'] += 1
            elif rtc.execution_status == ExecutionStatus.IN_PROGRESS:
                story_summary[story_id]['in_progress'] += 1
            elif rtc.execution_status == ExecutionStatus.NOT_STARTED:
                story_summary[story_id]['not_started'] += 1
    
    # Convert story_summary to list and calculate pass percentage
    story_summary_list = []
    for story_data in story_summary.values():
        pass_pct = (story_data['passed'] / story_data['total'] * 100) if story_data['total'] > 0 else 0
        story_data['pass_percentage'] = round(pass_pct, 1)
        story_summary_list.append(story_data)
    
    # Sort by story_id
    story_summary_list.sort(key=lambda x: x['story_id'])
    
    return {
        'release_id': release.id,
        'release_version': release.version,
        'release_name': release.name,
        'total_tests': total_tests,
        'passed_tests': passed_tests,
        'failed_tests': failed_tests,
        'blocked_tests': blocked_tests,
        'skipped_tests': skipped_tests,
        'in_progress_tests': in_progress_tests,
        'not_started_tests': not_started_tests,
        'module_summary': module_summary,
        'failed_test_details': failed_test_details,
        'story_summary': story_summary_list
    }
