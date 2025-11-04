# Test Cases Bulk Upload Feature

## Overview
The Bulk Upload feature allows you to create multiple test cases at once by uploading a CSV file. This is useful for migrating existing test cases or creating large numbers of test cases efficiently.

## How to Use

### Step 1: Access Bulk Upload
1. Navigate to the **Test Cases** page
2. Click the **"Bulk Upload"** button in the top right corner
3. A dialog will open with upload instructions

### Step 2: Prepare Your CSV File
You can either:
- Download the template file by clicking **"Download Template"** button
- Use the provided `test_cases_bulk_upload_template.csv` file as reference
- Create your own CSV file following the format below

### Step 3: Upload the File
1. Click on the upload area or drag-and-drop your CSV file
2. The file name will appear once selected
3. Click **"Upload"** to start the import process
4. Wait for the upload to complete
5. Review the success/error summary

## CSV File Format

### Required Columns
The CSV file must include these columns (case-sensitive):

| Column | Required | Valid Values | Description |
|--------|----------|--------------|-------------|
| `title` | ✅ Yes | Any text | Test case title/name |
| `test_type` | ✅ Yes | `manual` or `automated` | Type of test |
| `tag` | ✅ Yes | `ui`, `api`, or `hybrid` | Test category (determines test_id prefix) |
| `module_id` | ✅ Yes | Numeric ID | ID of the module (must exist in system) |

### Optional Columns
| Column | Required | Valid Values | Description |
|--------|----------|--------------|-------------|
| `description` | No | Any text | Detailed test description |
| `sub_module` | No | Any text | Sub-module name |
| `feature_section` | No | Any text | Feature/section name |
| `automation_status` | No | `working` or `broken` | Status for automated tests |
| `steps_to_reproduce` | No | Multi-line text | Test execution steps |
| `expected_result` | No | Any text | Expected outcome |
| `preconditions` | No | Multi-line text | Prerequisites |
| `test_data` | No | Multi-line text | Test data required |

### Important Notes

1. **Test ID Generation**: The `test_id` is automatically generated based on the `tag` value:
   - `ui` → TC_UI_1, TC_UI_2, ...
   - `api` → TC_API_1, TC_API_2, ...
   - `hybrid` → TC_HYBRID_1, TC_HYBRID_2, ...

2. **Multi-line Text**: For fields like `steps_to_reproduce`, use actual line breaks in your CSV editor:
   ```
   "1. First step
   2. Second step
   3. Third step"
   ```

3. **Special Characters**: Wrap text containing commas, quotes, or newlines in double quotes

4. **Module IDs**: You must know the numeric IDs of your modules. These can be found in the Modules section of the application.

## Example CSV Row

```csv
title,description,test_type,tag,module_id,sub_module,feature_section,automation_status,steps_to_reproduce,expected_result,preconditions,test_data
"Login with valid credentials","Verify successful login",manual,ui,1,Authentication,Login,,"1. Open login page
2. Enter valid credentials
3. Click Login","User is redirected to dashboard","Valid user account exists","Email: test@example.com
Password: Test123!"
```

## Error Handling

If any rows fail to import, you will see:
- Number of successfully created test cases
- Number of failed rows
- First 10 error messages with row numbers

Common errors:
- Missing required fields (title, test_type, tag, module_id)
- Invalid test_type value (must be 'manual' or 'automated')
- Invalid tag value (must be 'ui', 'api', or 'hybrid')
- Non-existent module_id
- Invalid module_id format (must be a number)

## Tips for Success

1. **Start Small**: Test with 2-3 rows first before uploading hundreds
2. **Use Template**: Download and modify the template file to ensure correct format
3. **Validate Module IDs**: Double-check that all module_id values exist in your system
4. **Check Encoding**: Save your CSV file with UTF-8 encoding
5. **Review in Excel/Sheets**: Most spreadsheet applications handle CSV formatting correctly

## Technical Details

- **File Type**: Only `.csv` files are accepted
- **Max File Size**: No explicit limit, but very large files may timeout
- **Processing**: Rows are processed sequentially
- **Transaction**: Each row is a separate transaction (failed rows don't affect successful ones)
- **Auto-generation**: Test IDs and file paths are automatically generated

## Support

If you encounter issues:
1. Check the browser console for detailed error messages
2. Verify your CSV format matches the template
3. Ensure all module IDs exist in the system
4. Contact the development team with the error details
