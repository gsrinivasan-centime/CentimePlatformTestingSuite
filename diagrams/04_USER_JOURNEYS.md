# User Journey Flowcharts

## 1. SDET User Journey - Complete Test Case Lifecycle

```mermaid
journey
    title SDET Daily Workflow
    section Morning Setup
      Login to Portal: 5: SDET
      Check Dashboard: 5: SDET
      Review Pending Tasks: 4: SDET
    section Test Case Creation
      Navigate to Test Cases: 5: SDET
      Create New Test Case: 4: SDET
      Fill Test Details: 3: SDET
      Link to JIRA Story: 4: SDET
      Save Test Case: 5: SDET
    section BDD Test Design
      Open Test Studio: 5: SDET
      Write Gherkin Scenarios: 3: SDET
      Use Step Catalog: 4: SDET
      Save as Draft: 5: SDET
      Publish Feature File: 5: SDET
    section Execution
      Open Release: 5: SDET
      Execute Test Cases: 4: SDET
      Update Status: 4: SDET
      Log Defects: 3: SDET
      Add Comments: 4: SDET
```

## 2. Test Manager Journey - Release Planning & Tracking

```mermaid
journey
    title Test Manager Release Workflow
    section Planning Phase
      Login to Portal: 5: Manager
      Create New Release: 5: Manager
      Link JIRA Stories: 4: Manager
      Add Test Cases: 4: Manager
      Assign to Team: 5: Manager
    section Monitoring Phase
      View Dashboard: 5: Manager
      Check Progress: 4: Manager
      Review Metrics: 5: Manager
      Identify Blockers: 3: Manager
      Follow Up: 4: Manager
    section Reporting Phase
      Generate Summary: 5: Manager
      Create PDF Report: 5: Manager
      Share with Stakeholders: 5: Manager
      Archive Release: 4: Manager
```

## 3. Developer Journey - Bug Fixing & Story Completion

```mermaid
journey
    title Developer Story Workflow
    section Story Assignment
      Receive Story: 3: Dev
      Login to Portal: 5: Dev
      View Linked Tests: 4: Dev
      Understand Requirements: 4: Dev
    section Development
      Implement Feature: 4: Dev
      Unit Testing: 4: Dev
      Update Story Status: 5: Dev
    section Bug Fixing
      Receive Bug Report: 2: Dev
      Check Bug Details: 4: Dev
      Fix Issue: 3: Dev
      Update Bug Status: 5: Dev
      Request Retest: 4: Dev
    section Verification
      Review Test Results: 4: Dev
      Check Coverage: 4: Dev
      Mark Story Done: 5: Dev
```

## 4. New User Onboarding Journey

```mermaid
flowchart TD
    Start([New User Joins Team]) --> Receive[Receive Portal Credentials]
    Receive --> FirstLogin[First Login to Portal]
    
    FirstLogin --> Dashboard[View Dashboard]
    Dashboard --> Explore{Explore Features}
    
    Explore -->|Test Cases| TCTour[View Test Cases Page]
    Explore -->|Test Studio| StudioTour[View Test Studio]
    Explore -->|Releases| ReleaseTour[View Releases]
    Explore -->|JIRA| JiraTour[View JIRA Stories]
    
    TCTour --> CreateFirst[Create First Test Case]
    CreateFirst --> FillForm[Fill Test Case Form]
    FillForm --> LinkStory[Link to JIRA Story]
    LinkStory --> SaveTC[Save Test Case]
    SaveTC --> ViewTC[View Saved Test Case]
    
    StudioTour --> OpenEditor[Open Monaco Editor]
    OpenEditor --> WriteGherkin[Write Simple Scenario]
    WriteGherkin --> SaveDraft[Save as Draft]
    SaveDraft --> PublishTest[Publish to Create Tests]
    PublishTest --> ViewGenerated[View Generated Test Cases]
    
    ReleaseTour --> ExploreRelease[Explore Active Release]
    ExploreRelease --> ViewModules[View Modules Tab]
    ViewModules --> UpdateStatus[Update Test Status]
    UpdateStatus --> AddComment[Add Execution Comment]
    
    JiraTour --> FetchStory[Fetch JIRA Story]
    FetchStory --> ViewStoryTests[View Linked Tests]
    ViewStoryTests --> LinkTest[Link Additional Test]
    
    ViewTC --> Confident{Feel Confident?}
    ViewGenerated --> Confident
    AddComment --> Confident
    LinkTest --> Confident
    
    Confident -->|No| GetHelp[Review Documentation]
    Confident -->|Yes| ProductiveUser[Become Productive User]
    
    GetHelp --> Confident
    ProductiveUser --> End([Onboarding Complete])
    
    style Start fill:#4caf50
    style ProductiveUser fill:#4caf50
    style End fill:#4caf50
    style Confident fill:#ff9800
```

## 5. Test Case Creation User Journey (Detailed)

```mermaid
flowchart TD
    Start([User Decides to Create Test]) --> Decision{Test Type?}
    
    Decision -->|Manual Test| ManualPath[Navigate to Test Cases]
    Decision -->|BDD Test| BDDPath[Navigate to Test Studio]
    
    ManualPath --> SelectModule[Select Module]
    SelectModule --> ClickCreate[Click Create Button]
    ClickCreate --> OpenForm[Form Opens]
    
    OpenForm --> FillBasic[Fill Basic Details]
    FillBasic --> FillSteps[Enter Test Steps]
    FillSteps --> FillExpected[Enter Expected Results]
    FillExpected --> SetPriority[Set Priority]
    SetPriority --> AddTags[Add Tags]
    
    AddTags --> LinkDecision{Link to Story?}
    LinkDecision -->|Yes| SearchStory[Search JIRA Story]
    LinkDecision -->|No| SkipLink[Skip Story Link]
    
    SearchStory --> SelectStory[Select Story]
    SelectStory --> CreateLink[Create Link]
    CreateLink --> SaveForm[Save Test Case]
    SkipLink --> SaveForm
    
    SaveForm --> AutoGenID[System Generates Test ID]
    AutoGenID --> Success1[Show Success Message]
    Success1 --> ViewList[View in Test Cases List]
    
    BDDPath --> CreateFeature[Create Feature File]
    CreateFeature --> OpenMonaco[Monaco Editor Opens]
    OpenMonaco --> WriteFeature[Write Feature Statement]
    WriteFeature --> WriteScenario[Write Scenario]
    
    WriteScenario --> UseSteps{Use Step Catalog?}
    UseSteps -->|Yes| SearchSteps[Search Existing Steps]
    UseSteps -->|No| TypeManually[Type Steps Manually]
    
    SearchSteps --> InsertSteps[Insert Steps]
    TypeManually --> AddGiven[Add Given Steps]
    InsertSteps --> AddGiven
    
    AddGiven --> AddWhen[Add When Steps]
    AddWhen --> AddThen[Add Then Steps]
    AddThen --> AddExamples{Add Examples?}
    
    AddExamples -->|Yes| CreateTable[Create Examples Table]
    AddExamples -->|No| SkipExamples[Skip Examples]
    
    CreateTable --> SaveDraft[Save as Draft]
    SkipExamples --> SaveDraft
    
    SaveDraft --> ReviewContent[Review Content]
    ReviewContent --> PublishDecision{Ready to Publish?}
    
    PublishDecision -->|Yes| ClickPublish[Click Publish]
    PublishDecision -->|No| ContinueEditing[Continue Editing Later]
    
    ClickPublish --> ParseGherkin[System Parses Gherkin]
    ParseGherkin --> CreateTCs[Create Test Cases]
    CreateTCs --> ShowCount[Show Created Count]
    ShowCount --> ViewGenerated[View Generated Tests]
    
    ContinueEditing --> End1([Draft Saved])
    ViewList --> End2([Test Case Created])
    ViewGenerated --> End2
    
    style Start fill:#4caf50
    style Success1 fill:#4caf50
    style ShowCount fill:#4caf50
    style End1 fill:#4caf50
    style End2 fill:#4caf50
    style Decision fill:#ff9800
    style UseSteps fill:#ff9800
    style LinkDecision fill:#ff9800
    style PublishDecision fill:#ff9800
```

## 6. Release Execution User Journey

```mermaid
flowchart TD
    Start([Release Testing Starts]) --> OpenRelease[Open Release Detail]
    OpenRelease --> ViewTabs[View Available Tabs]
    
    ViewTabs --> SelectTab{Select Tab}
    
    SelectTab -->|Dashboard| ViewDash[View Dashboard Metrics]
    SelectTab -->|Stories| ManageStories[Manage JIRA Stories]
    SelectTab -->|Modules| ExecuteTests[Execute Test Cases]
    SelectTab -->|Bugs| TrackBugs[Track Bugs]
    
    ViewDash --> CheckProgress[Check Overall Progress]
    CheckProgress --> ViewCharts[View Charts & Graphs]
    ViewCharts --> IdentifyIssues{Issues Found?}
    
    IdentifyIssues -->|Yes| SelectTab
    IdentifyIssues -->|No| GenerateReport[Generate Report]
    
    ManageStories --> StoryAction{Story Action}
    StoryAction -->|Add New| FetchJira[Fetch from JIRA]
    StoryAction -->|View Tests| ShowLinked[Show Linked Tests]
    StoryAction -->|Unlink| RemoveStory[Remove Story]
    
    FetchJira --> SaveStory[Save Story Details]
    SaveStory --> Success1[Story Added]
    Success1 --> ManageStories
    
    ShowLinked --> LinkMore{Link More Tests?}
    LinkMore -->|Yes| SelectTests[Select Test Cases]
    LinkMore -->|No| ManageStories
    SelectTests --> CreateLinks[Create Links]
    CreateLinks --> Success2[Tests Linked]
    Success2 --> ManageStories
    
    ExecuteTests --> FilterTests{Filter Tests?}
    FilterTests -->|By Module| FilterModule[Select Module]
    FilterTests -->|By Status| FilterStatus[Select Status]
    FilterTests -->|No Filter| ViewAllTests[View All Tests]
    
    FilterModule --> ViewFiltered[View Filtered Tests]
    FilterStatus --> ViewFiltered
    ViewAllTests --> ViewFiltered
    
    ViewFiltered --> SelectTest[Select Test Case]
    SelectTest --> ExecuteTest[Execute Test]
    
    ExecuteTest --> TestResult{Test Result?}
    
    TestResult -->|Pass| MarkPass[Mark as Passed]
    TestResult -->|Fail| MarkFail[Mark as Failed]
    TestResult -->|Blocked| MarkBlocked[Mark as Blocked]
    
    MarkPass --> AddComment1[Add Comments]
    MarkFail --> LogBug[Log Bug Details]
    MarkBlocked --> LogBlocker[Log Blocker Reason]
    
    AddComment1 --> SaveExecution[Save Execution]
    LogBug --> ReportBug[Report in Bug Tab]
    LogBlocker --> SaveExecution
    
    ReportBug --> SaveExecution
    SaveExecution --> MoreTests{More Tests?}
    
    MoreTests -->|Yes| ViewFiltered
    MoreTests -->|No| UpdateProgress[Update Progress]
    
    TrackBugs --> BugAction{Bug Action}
    BugAction -->|Add New| CreateBug[Create Bug Report]
    BugAction -->|Update| UpdateBug[Update Bug Status]
    BugAction -->|View| ViewBugDetails[View Bug Details]
    
    CreateBug --> FillBugForm[Fill Bug Details]
    FillBugForm --> AssignDev[Assign to Developer]
    AssignDev --> AttachEvidence[Attach Screenshots/Videos]
    AttachEvidence --> SaveBug[Save Bug]
    SaveBug --> Success3[Bug Reported]
    Success3 --> TrackBugs
    
    UpdateBug --> ChangeStatus[Change Status]
    ChangeStatus --> AddBugComment[Add Comment]
    AddBugComment --> SaveUpdate[Save Update]
    SaveUpdate --> Success4[Bug Updated]
    Success4 --> TrackBugs
    
    UpdateProgress --> CheckComplete{All Tests Done?}
    CheckComplete -->|No| SelectTab
    CheckComplete -->|Yes| FinalReview[Final Review]
    
    FinalReview --> GenerateReport
    GenerateReport --> CreatePDF[Create PDF Report]
    CreatePDF --> DownloadPDF[Download Report]
    DownloadPDF --> ShareReport[Share with Team]
    ShareReport --> CloseRelease[Close Release]
    CloseRelease --> End([Release Complete])
    
    style Start fill:#4caf50
    style Success1 fill:#4caf50
    style Success2 fill:#4caf50
    style Success3 fill:#4caf50
    style Success4 fill:#4caf50
    style End fill:#4caf50
    style TestResult fill:#ff9800
    style BugAction fill:#ff9800
    style CheckComplete fill:#ff9800
```

## 7. JIRA Integration User Journey

```mermaid
flowchart TD
    Start([Need to Link JIRA Story]) --> OpenJira[Open JIRA Stories Page]
    OpenJira --> CheckExists{Story Already Added?}
    
    CheckExists -->|No| AddNew[Click Add Story]
    CheckExists -->|Yes| ViewExisting[View Existing Story]
    
    AddNew --> EnterURL[Enter JIRA URL]
    EnterURL --> FetchAPI[System Fetches Details]
    FetchAPI --> ValidateAPI{Valid Response?}
    
    ValidateAPI -->|No| ShowError[Show Error Message]
    ValidateAPI -->|Yes| ParseDetails[Parse Story Details]
    
    ShowError --> RetryURL{Retry?}
    RetryURL -->|Yes| EnterURL
    RetryURL -->|No| End1([Cancelled])
    
    ParseDetails --> DisplayPreview[Display Story Preview]
    DisplayPreview --> ConfirmAdd{Confirm Add?}
    
    ConfirmAdd -->|No| EnterURL
    ConfirmAdd -->|Yes| SaveStory[Save Story to DB]
    SaveStory --> Success1[Story Added Successfully]
    Success1 --> ViewStoryList[View Stories List]
    
    ViewExisting --> ViewStoryList
    ViewStoryList --> StoryActions{Story Actions}
    
    StoryActions -->|Link Test| LinkTestCase[Select Test Case to Link]
    StoryActions -->|View Tests| ViewLinkedTests[Show Linked Test Cases]
    StoryActions -->|Refetch| RefreshDetails[Refresh from JIRA]
    StoryActions -->|Unlink Test| SelectUnlink[Select Test to Unlink]
    StoryActions -->|Delete Story| CheckDelete{Has Linked Tests?}
    
    LinkTestCase --> SearchTests[Search Test Cases]
    SearchTests --> SelectTest[Select Test Case]
    SelectTest --> CheckLink{Already Linked?}
    
    CheckLink -->|Yes| ShowWarning[Show Already Linked]
    CheckLink -->|No| CreateLink[Create Junction Record]
    
    ShowWarning --> SearchTests
    CreateLink --> UpdateCounts[Update Test Counts]
    UpdateCounts --> Success2[Link Created]
    Success2 --> ViewStoryList
    
    ViewLinkedTests --> TestsList[Display Linked Tests]
    TestsList --> TestAction{Test Action}
    TestAction -->|View Details| ShowTestDetails[Show Test Case Details]
    TestAction -->|Unlink| ConfirmUnlink{Confirm Unlink?}
    TestAction -->|Back| ViewStoryList
    
    ShowTestDetails --> TestsList
    
    ConfirmUnlink -->|No| TestsList
    ConfirmUnlink -->|Yes| RemoveLink[Delete Junction Record]
    RemoveLink --> UpdateCounts2[Update Counts]
    UpdateCounts2 --> Success3[Test Unlinked]
    Success3 --> TestsList
    
    SelectUnlink --> TestsList
    
    RefreshDetails --> CallJiraAPI[Call JIRA API]
    CallJiraAPI --> UpdateStory[Update Story Fields]
    UpdateStory --> Success4[Story Refreshed]
    Success4 --> ViewStoryList
    
    CheckDelete -->|Yes| ShowDeleteError[Cannot Delete - Has Tests]
    CheckDelete -->|No| ConfirmDelete{Confirm Delete?}
    
    ShowDeleteError --> ViewStoryList
    ConfirmDelete -->|No| ViewStoryList
    ConfirmDelete -->|Yes| DeleteStory[Delete Story]
    DeleteStory --> Success5[Story Deleted]
    Success5 --> ViewStoryList
    
    ViewStoryList --> Done{Done?}
    Done -->|No| StoryActions
    Done -->|Yes| End2([Complete])
    
    style Start fill:#4caf50
    style Success1 fill:#4caf50
    style Success2 fill:#4caf50
    style Success3 fill:#4caf50
    style Success4 fill:#4caf50
    style Success5 fill:#4caf50
    style End1 fill:#757575
    style End2 fill:#4caf50
    style ShowError fill:#f44336
    style ShowWarning fill:#ff9800
    style ShowDeleteError fill:#f44336
```

## 8. Report Generation User Journey

```mermaid
flowchart TD
    Start([Need to Generate Report]) --> OpenRelease[Open Release Dashboard]
    OpenRelease --> ViewMetrics[View Current Metrics]
    
    ViewMetrics --> CheckReady{Release Ready?}
    
    CheckReady -->|No| CheckWhat{What's Missing?}
    CheckReady -->|Yes| GenerateReport[Click Generate Report]
    
    CheckWhat -->|Tests Not Done| ExecuteTests[Execute Pending Tests]
    CheckWhat -->|Stories Missing| AddStories[Add JIRA Stories]
    CheckWhat -->|Data Incomplete| UpdateData[Update Test Data]
    
    ExecuteTests --> ViewMetrics
    AddStories --> ViewMetrics
    UpdateData --> ViewMetrics
    
    GenerateReport --> ShowProgress[Show Generation Progress]
    ShowProgress --> FetchData[Fetch All Data]
    FetchData --> ProcessData[Process & Aggregate]
    ProcessData --> CreateCharts[Generate Charts]
    CreateCharts --> BuildPDF[Build PDF Document]
    
    BuildPDF --> Success{PDF Created?}
    
    Success -->|Yes| PreviewReport[Preview Report]
    Success -->|No| ShowError[Show Error Message]
    
    ShowError --> RetryGenerate{Retry?}
    RetryGenerate -->|Yes| GenerateReport
    RetryGenerate -->|No| End1([Cancelled])
    
    PreviewReport --> SatisfiedReport{Satisfied with Report?}
    
    SatisfiedReport -->|No| UpdateReleaseData[Update Release Data]
    SatisfiedReport -->|Yes| DownloadPDF[Download PDF]
    
    UpdateReleaseData --> ViewMetrics
    
    DownloadPDF --> SaveLocal[Save to Local Machine]
    SaveLocal --> ShareOptions{Share Report?}
    
    ShareOptions -->|Email| EmailReport[Email to Stakeholders]
    ShareOptions -->|Upload| UploadCloud[Upload to Cloud]
    ShareOptions -->|Print| PrintReport[Print Hard Copy]
    ShareOptions -->|None| SkipShare[Skip Sharing]
    
    EmailReport --> MarkShared[Mark as Shared]
    UploadCloud --> MarkShared
    PrintReport --> MarkShared
    SkipShare --> MarkShared
    
    MarkShared --> ArchiveDecision{Archive Release?}
    
    ArchiveDecision -->|Yes| ArchiveRelease[Archive Release]
    ArchiveDecision -->|No| KeepActive[Keep Active]
    
    ArchiveRelease --> Success2[Release Archived]
    KeepActive --> Success2
    Success2 --> End2([Complete])
    
    style Start fill:#4caf50
    style Success2 fill:#4caf50
    style End2 fill:#4caf50
    style End1 fill:#757575
    style CheckReady fill:#ff9800
    style Success fill:#ff9800
    style SatisfiedReport fill:#ff9800
    style ShowError fill:#f44336
```
