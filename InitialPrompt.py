instructions = """

As an organisation, i want to have test report for our application before each release.
My organisation's application has a cash management system which has web interface as well as APIs.
The cash management system has multiple modules like account payable, account receivable, cash flow forecasting and Banking integrations.



I want to create a test suite that has all the test cases for my application.
The consolidated test report sheet should in the forma of google sheets or excel sheet.

The test cases should be able to execute UI tests as well as API tests. 
The test cases can be manul or automated. Each test case should have a unique ID, description, steps to reproduce, expected result, actual result, and status (pass/fail).

The tech stack for the test suite should be Python with pytest framework for automated tests and Selenium for UI tests.
For executing the API tests, we can use the requests library.

In addition to having a regular test suite, i want to have Web interface where i can add, edit, delete and execute test cases. 
The web interface should also provide a dashboard to view the test results and generate test reports in PDF formats.

The web interface should be built using FastAPI framework.
Lets use ReactJS for the frontend of the web interface with Material UI for styling. Use Axios for making API calls from the frontend to the backend.
Always use only Material UI components for the frontend design. No other CSS frameworks should be used.

The web interface should also have user authentication and authorization features to ensure that only authorized users can access and modify the test cases.
Create a detailed plan to implement this test suite and web interface, including the following steps:
We can use the sqlite datavase for storing the test cases and their results of each releases.

Inside the web interface, we should have the following features:
1. User Registration and Login: Allow users to create accounts and log in to access the test suite. Allow registration only if the user has email with @centime.com domain.
2. Test Case Management: Provide functionality to add, edit, and delete test cases. Each test case should have a unique ID, description, steps to reproduce, expected result, actual result, and status (pass/fail).
3. Test Execution: Allow users to execute test cases from the web interface and view the results in real-time.
4. Test Reporting: Generate test reports in PDF format and provide a dashboard to view test results and trends over time.
5. User Roles and Permissions: Implement user roles (e.g., admin, tester) and permissions to control access to different features of the web interface.


The major use of this entire project is to have a consolidated test report for each release of our cash management system application.
In each report, module wise test cases execution status should be mentioned. If no test cases are present for a module, it should be clearly indicated in the report.
The report should have additional column which says who executed the test cases. If any defects were logged in JIRA in that sprint for that feature, the defect IDs should also be mentioned in the report against that test case.

When I login and want to see the test report for a particular release, I should be able to see module wise test case execution status, who executed the test cases and any defect IDs logged in JIRA for that feature.

These reports are to be used for management reviews and audits.
generate a step by step implementation plan for this entire project.

Everything should be inside a single git repository which has clear folder structure for backend, frontend, test cases and documentation.
The test cases of Frontend and backend should be present inside respective folders.

As a first prompt, is suggest to have only two test cases, one for UI and one for API.


"""