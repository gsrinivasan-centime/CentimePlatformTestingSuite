# Feature Flow Diagrams

## 1. Test Case Creation Flow

```mermaid
flowchart TD
    Start([User Opens Test Cases Page]) --> SelectModule{Select Module?}
    SelectModule -->|Yes| FilterModule[Filter by Module]
    SelectModule -->|No| ViewAll[View All Test Cases]
    
    FilterModule --> ViewTestCases[Display Test Cases]
    ViewAll --> ViewTestCases
    
    ViewTestCases --> Action{User Action}
    
    Action -->|Create New| OpenForm[Open Create Form]
    Action -->|Edit Existing| LoadData[Load Test Case Data]
    Action -->|Delete| ConfirmDelete{Confirm Delete?}
    Action -->|Link to Story| SelectStory[Select JIRA Story]
    Action -->|Bulk Upload| UploadExcel[Upload Excel File]
    
    OpenForm --> FillForm[Fill Test Case Details]
    LoadData --> EditForm[Edit Form]
    
    FillForm --> FillDetails{Complete Details?}
    EditForm --> FillDetails
    
    FillDetails -->|Yes| GenerateID[Auto-generate Test ID]
    FillDetails -->|No| FillForm
    
    GenerateID --> SaveTC[Save to Database]
    SaveTC --> Success1[Show Success Message]
    Success1 --> ViewTestCases
    
    SelectStory --> LinkStory[Create Link in Junction Table]
    LinkStory --> UpdateCount[Update Test Case Count]
    UpdateCount --> Success2[Show Success Message]
    Success2 --> ViewTestCases
    
    ConfirmDelete -->|Yes| DeleteTC[Delete Test Case]
    ConfirmDelete -->|No| ViewTestCases
    DeleteTC --> Success3[Show Success Message]
    Success3 --> ViewTestCases
    
    UploadExcel --> ParseExcel[Parse Excel File]
    ParseExcel --> ValidateData{Valid Data?}
    ValidateData -->|Yes| BulkInsert[Bulk Insert Test Cases]
    ValidateData -->|No| ShowErrors[Show Validation Errors]
    BulkInsert --> Success4[Show Import Summary]
    ShowErrors --> ViewTestCases
    Success4 --> ViewTestCases
    
    style Start fill:#4caf50
    style SaveTC fill:#2196f3
    style Success1 fill:#4caf50
    style Success2 fill:#4caf50
    style Success3 fill:#4caf50
    style Success4 fill:#4caf50
    style ShowErrors fill:#f44336
```

## 2. Test Design Studio Flow (Gherkin/BDD)

```mermaid
flowchart TD
    Start([User Opens Test Design Studio]) --> ViewFiles[Display Feature Files]
    
    ViewFiles --> Action{User Action}
    
    Action -->|Create New| OpenEditor[Open Monaco Editor]
    Action -->|Edit Draft| LoadDraft[Load Draft Content]
    Action -->|View Published| ViewMode[Open in Read-Only Mode]
    Action -->|Delete| ConfirmDel{Confirm Delete?}
    
    OpenEditor --> WriteGherkin[Write Gherkin Scenarios]
    LoadDraft --> EditGherkin[Edit Gherkin Content]
    
    WriteGherkin --> UserChoice{User Choice}
    EditGherkin --> UserChoice
    
    UserChoice -->|Save Draft| SaveDraft[Save as Draft]
    UserChoice -->|Publish| ValidateGherkin{Valid Gherkin?}
    
    SaveDraft --> UpdateDB[Update Database]
    UpdateDB --> Success1[Show Toaster Message]
    Success1 --> ViewFiles
    
    ValidateGherkin -->|Yes| ParseGherkin[Parse Feature File]
    ValidateGherkin -->|No| ShowError[Show Syntax Errors]
    ShowError --> EditGherkin
    
    ParseGherkin --> ExtractScenarios[Extract Scenarios]
    ExtractScenarios --> CreateTCs[Create Test Cases]
    CreateTCs --> MarkPublished[Mark as Published]
    MarkPublished --> Success2[Show Success with Count]
    Success2 --> ViewFiles
    
    ViewMode --> UserAction{User Action}
    UserAction -->|Close| ViewFiles
    UserAction -->|Restore| RestoreDraft{Confirm Restore?}
    
    RestoreDraft -->|Yes| ChangeToDraft[Change Status to Draft]
    RestoreDraft -->|No| ViewMode
    ChangeToDraft --> Success3[Show Success Message]
    Success3 --> ViewFiles
    
    ConfirmDel -->|Yes| DeleteFile[Delete Feature File]
    ConfirmDel -->|No| ViewFiles
    DeleteFile --> Success4[Show Success Message]
    Success4 --> ViewFiles
    
    style Start fill:#4caf50
    style SaveDraft fill:#2196f3
    style CreateTCs fill:#2196f3
    style Success1 fill:#4caf50
    style Success2 fill:#4caf50
    style Success3 fill:#4caf50
    style Success4 fill:#4caf50
    style ShowError fill:#f44336
```

## 3. Release Management Flow

```mermaid
flowchart TD
    Start([User Opens Release Management]) --> ViewReleases[Display All Releases]
    
    ViewReleases --> Action{User Action}
    
    Action -->|Create Release| OpenForm[Open Create Release Form]
    Action -->|View Details| LoadRelease[Load Release Details]
    Action -->|Delete| ConfirmDel{Confirm Delete?}
    
    OpenForm --> FillRelease[Enter Version & Dates]
    FillRelease --> CreateRelease[Create Release]
    CreateRelease --> Success1[Show Success Message]
    Success1 --> ViewReleases
    
    LoadRelease --> ShowTabs[Show Release Tabs]
    
    ShowTabs --> TabChoice{Select Tab}
    
    TabChoice -->|Dashboard| ShowDash[Show Overview Dashboard]
    TabChoice -->|Stories| ManageStories[Manage JIRA Stories]
    TabChoice -->|Modules| ManageModules[Manage Test Cases]
    TabChoice -->|Bugs| ManageBugs[Manage Bugs]
    
    ShowDash --> DisplayMetrics[Display Metrics & Charts]
    DisplayMetrics --> DashAction{User Action}
    DashAction -->|Generate Report| GenerateReport[Generate PDF Report]
    DashAction -->|Refresh| ShowDash
    DashAction -->|Back| ViewReleases
    
    ManageStories --> StoryAction{User Action}
    StoryAction -->|Link Story| FetchJira[Fetch from JIRA]
    StoryAction -->|Unlink| RemoveStory[Remove Story Link]
    StoryAction -->|View Tests| ShowLinkedTests[Show Linked Test Cases]
    FetchJira --> SaveStory[Save Story Details]
    SaveStory --> Success2[Show Success]
    Success2 --> ManageStories
    
    ManageModules --> ModuleAction{User Action}
    ModuleAction -->|Add Test Cases| SelectTests[Select Test Cases]
    ModuleAction -->|Update Status| ChangeStatus[Update Execution Status]
    ModuleAction -->|Add Comments| AddComments[Add Execution Comments]
    
    SelectTests --> LinkTests[Link to Release]
    LinkTests --> Success3[Show Success]
    Success3 --> ManageModules
    
    ChangeStatus --> UpdateDB[Update Database]
    UpdateDB --> Success4[Show Success]
    Success4 --> ManageModules
    
    AddComments --> SaveComments[Save Comments]
    SaveComments --> Success5[Show Success]
    Success5 --> ManageModules
    
    ManageBugs --> BugAction{User Action}
    BugAction -->|Add Bug| OpenBugForm[Open Bug Form]
    BugAction -->|Edit Bug| LoadBugData[Load Bug Details]
    BugAction -->|Delete Bug| ConfirmBugDel{Confirm?}
    
    OpenBugForm --> FillBugDetails[Fill Bug Details]
    FillBugDetails --> SaveBug[Save Bug]
    SaveBug --> Success6[Show Success]
    Success6 --> ManageBugs
    
    LoadBugData --> EditBug[Edit Bug Form]
    EditBug --> UpdateBug[Update Bug]
    UpdateBug --> Success7[Show Success]
    Success7 --> ManageBugs
    
    ConfirmBugDel -->|Yes| DeleteBug[Delete Bug]
    ConfirmBugDel -->|No| ManageBugs
    DeleteBug --> Success8[Show Success]
    Success8 --> ManageBugs
    
    ConfirmDel -->|Yes| DeleteRelease[Delete Release]
    ConfirmDel -->|No| ViewReleases
    DeleteRelease --> Success9[Show Success]
    Success9 --> ViewReleases
    
    GenerateReport --> CreatePDF[Generate PDF Report]
    CreatePDF --> DownloadPDF[Download PDF]
    DownloadPDF --> ShowDash
    
    style Start fill:#4caf50
    style CreateRelease fill:#2196f3
    style SaveStory fill:#2196f3
    style LinkTests fill:#2196f3
    style Success1 fill:#4caf50
    style Success2 fill:#4caf50
    style Success3 fill:#4caf50
    style Success4 fill:#4caf50
    style Success5 fill:#4caf50
    style Success6 fill:#4caf50
    style Success7 fill:#4caf50
    style Success8 fill:#4caf50
    style Success9 fill:#4caf50
```

## 4. JIRA Stories Integration Flow

```mermaid
flowchart TD
    Start([User Opens JIRA Stories]) --> ViewStories[Display All Stories]
    
    ViewStories --> Action{User Action}
    
    Action -->|Add Story| EnterURL[Enter JIRA URL]
    Action -->|Link Test Case| SelectTC[Select Test Case]
    Action -->|Unlink Test Case| ConfirmUnlink{Confirm Unlink?}
    Action -->|View Test Cases| ShowTests[Show Linked Tests]
    Action -->|Refetch| RefreshStory[Refetch from JIRA]
    Action -->|Delete Story| ConfirmDel{Confirm Delete?}
    
    EnterURL --> FetchJira[Call JIRA API]
    FetchJira --> ValidJira{Valid Response?}
    ValidJira -->|Yes| ParseStory[Parse Story Details]
    ValidJira -->|No| ShowError[Show Error Message]
    ShowError --> ViewStories
    
    ParseStory --> SaveStory[Save Story to DB]
    SaveStory --> Success1[Show Success Message]
    Success1 --> ViewStories
    
    SelectTC --> CheckLink{Already Linked?}
    CheckLink -->|No| CreateLink[Create Junction Record]
    CheckLink -->|Yes| ShowInfo[Show Already Linked]
    ShowInfo --> ViewStories
    
    CreateLink --> UpdatePrimary{First Link?}
    UpdatePrimary -->|Yes| SetPrimary[Set jira_story_id]
    UpdatePrimary -->|No| KeepExisting[Keep Existing Primary]
    
    SetPrimary --> UpdateCount[Update Test Case Count]
    KeepExisting --> UpdateCount
    UpdateCount --> Success2[Show Success]
    Success2 --> ViewStories
    
    ConfirmUnlink -->|Yes| RemoveLink[Delete Junction Record]
    ConfirmUnlink -->|No| ViewStories
    RemoveLink --> CheckPrimary{Was Primary Link?}
    CheckPrimary -->|Yes| UpdateNewPrimary[Update to Next Story]
    CheckPrimary -->|No| JustRemove[Just Remove Link]
    UpdateNewPrimary --> UpdateCount2[Update Count]
    JustRemove --> UpdateCount2
    UpdateCount2 --> Success3[Show Success]
    Success3 --> ViewStories
    
    ShowTests --> DisplayTests[Display Linked Test Cases]
    DisplayTests --> TestAction{User Action}
    TestAction -->|Unlink| ConfirmUnlink
    TestAction -->|View Details| ShowTCDetails[Show Test Case Details]
    TestAction -->|Back| ViewStories
    ShowTCDetails --> DisplayTests
    
    RefreshStory --> CallJira[Call JIRA API]
    CallJira --> UpdateStory[Update Story Details]
    UpdateStory --> Success4[Show Success]
    Success4 --> ViewStories
    
    ConfirmDel -->|Yes| CheckLinkedTCs{Has Linked Tests?}
    ConfirmDel -->|No| ViewStories
    CheckLinkedTCs -->|Yes| ShowWarning[Show Warning - Cannot Delete]
    CheckLinkedTCs -->|No| DeleteStory[Delete Story]
    ShowWarning --> ViewStories
    DeleteStory --> Success5[Show Success]
    Success5 --> ViewStories
    
    style Start fill:#4caf50
    style SaveStory fill:#2196f3
    style CreateLink fill:#2196f3
    style RemoveLink fill:#ff9800
    style Success1 fill:#4caf50
    style Success2 fill:#4caf50
    style Success3 fill:#4caf50
    style Success4 fill:#4caf50
    style Success5 fill:#4caf50
    style ShowError fill:#f44336
    style ShowWarning fill:#ff9800
```

## 5. Module & Sub-Module Management Flow

```mermaid
flowchart TD
    Start([User Opens Modules Page]) --> ViewModules[Display All Modules]
    
    ViewModules --> Action{User Action}
    
    Action -->|Create Module| OpenModForm[Open Module Form]
    Action -->|Edit Module| LoadModData[Load Module Data]
    Action -->|Delete Module| CheckModDeps{Has Dependencies?}
    Action -->|View Sub-Modules| ShowSubMods[Display Sub-Modules]
    
    OpenModForm --> FillModDetails[Enter Module Name & Description]
    FillModDetails --> SaveModule[Save Module]
    SaveModule --> Success1[Show Success]
    Success1 --> ViewModules
    
    LoadModData --> EditModForm[Edit Module Form]
    EditModForm --> UpdateModule[Update Module]
    UpdateModule --> Success2[Show Success]
    Success2 --> ViewModules
    
    CheckModDeps -->|Yes| ShowWarning[Show Warning - Cannot Delete]
    CheckModDeps -->|No| ConfirmDelMod{Confirm Delete?}
    ShowWarning --> ViewModules
    ConfirmDelMod -->|Yes| DeleteModule[Delete Module]
    ConfirmDelMod -->|No| ViewModules
    DeleteModule --> Success3[Show Success]
    Success3 --> ViewModules
    
    ShowSubMods --> SubModAction{User Action}
    
    SubModAction -->|Create Sub-Module| OpenSubForm[Open Sub-Module Form]
    SubModAction -->|Edit Sub-Module| LoadSubData[Load Sub-Module Data]
    SubModAction -->|Delete Sub-Module| CheckSubDeps{Has Dependencies?}
    SubModAction -->|View Features| ShowFeatures[Display Features]
    SubModAction -->|Back| ViewModules
    
    OpenSubForm --> FillSubDetails[Enter Sub-Module Details]
    FillSubDetails --> SaveSubMod[Save Sub-Module]
    SaveSubMod --> Success4[Show Success]
    Success4 --> ShowSubMods
    
    LoadSubData --> EditSubForm[Edit Sub-Module Form]
    EditSubForm --> UpdateSubMod[Update Sub-Module]
    UpdateSubMod --> Success5[Show Success]
    Success5 --> ShowSubMods
    
    CheckSubDeps -->|Yes| ShowWarning2[Show Warning]
    CheckSubDeps -->|No| ConfirmDelSub{Confirm Delete?}
    ShowWarning2 --> ShowSubMods
    ConfirmDelSub -->|Yes| DeleteSubMod[Delete Sub-Module]
    ConfirmDelSub -->|No| ShowSubMods
    DeleteSubMod --> Success6[Show Success]
    Success6 --> ShowSubMods
    
    ShowFeatures --> FeatureAction{User Action}
    
    FeatureAction -->|Create Feature| OpenFeatForm[Open Feature Form]
    FeatureAction -->|Edit Feature| LoadFeatData[Load Feature Data]
    FeatureAction -->|Delete Feature| CheckFeatDeps{Has Dependencies?}
    FeatureAction -->|Back| ShowSubMods
    
    OpenFeatForm --> FillFeatDetails[Enter Feature Details]
    FillFeatDetails --> SaveFeature[Save Feature]
    SaveFeature --> Success7[Show Success]
    Success7 --> ShowFeatures
    
    LoadFeatData --> EditFeatForm[Edit Feature Form]
    EditFeatForm --> UpdateFeature[Update Feature]
    UpdateFeature --> Success8[Show Success]
    Success8 --> ShowFeatures
    
    CheckFeatDeps -->|Yes| ShowWarning3[Show Warning]
    CheckFeatDeps -->|No| ConfirmDelFeat{Confirm Delete?}
    ShowWarning3 --> ShowFeatures
    ConfirmDelFeat -->|Yes| DeleteFeature[Delete Feature]
    ConfirmDelFeat -->|No| ShowFeatures
    DeleteFeature --> Success9[Show Success]
    Success9 --> ShowFeatures
    
    style Start fill:#4caf50
    style SaveModule fill:#2196f3
    style SaveSubMod fill:#2196f3
    style SaveFeature fill:#2196f3
    style Success1 fill:#4caf50
    style Success2 fill:#4caf50
    style Success3 fill:#4caf50
    style Success4 fill:#4caf50
    style Success5 fill:#4caf50
    style Success6 fill:#4caf50
    style Success7 fill:#4caf50
    style Success8 fill:#4caf50
    style Success9 fill:#4caf50
    style ShowWarning fill:#ff9800
    style ShowWarning2 fill:#ff9800
    style ShowWarning3 fill:#ff9800
```

## 6. Report Generation Flow

```mermaid
flowchart TD
    Start([User Requests Report]) --> SelectRelease[Select Release]
    
    SelectRelease --> FetchData[Fetch Release Data]
    FetchData --> FetchStories[Fetch Linked Stories]
    FetchStories --> FetchTestCases[Fetch Test Cases]
    FetchTestCases --> FetchModules[Fetch Module Details]
    
    FetchModules --> ProcessData[Process & Aggregate Data]
    
    ProcessData --> CalcMetrics{Calculate Metrics}
    
    CalcMetrics --> TotalTests[Count Total Test Cases]
    CalcMetrics --> PassFail[Count Pass/Fail/Blocked]
    CalcMetrics --> Coverage[Calculate Coverage %]
    CalcMetrics --> ModuleBreakdown[Module-wise Breakdown]
    CalcMetrics --> StoryStatus[Story-wise Status]
    
    TotalTests --> GenerateCharts[Generate Charts]
    PassFail --> GenerateCharts
    Coverage --> GenerateCharts
    ModuleBreakdown --> GenerateCharts
    StoryStatus --> GenerateCharts
    
    GenerateCharts --> PieChart[Pass/Fail Pie Chart]
    GenerateCharts --> BarChart[Module Bar Chart]
    GenerateCharts --> LineChart[Progress Line Chart]
    
    PieChart --> DisplayDashboard[Display Dashboard]
    BarChart --> DisplayDashboard
    LineChart --> DisplayDashboard
    
    DisplayDashboard --> UserAction{User Action}
    
    UserAction -->|View Details| DrillDown[Show Detailed View]
    UserAction -->|Export PDF| GeneratePDF[Generate PDF Report]
    UserAction -->|Refresh| FetchData
    UserAction -->|Close| End([End])
    
    DrillDown --> ShowModuleDetails[Show Module Test Cases]
    ShowModuleDetails --> ShowTestDetails[Show Individual Tests]
    ShowTestDetails --> DisplayDashboard
    
    GeneratePDF --> CreateHeader[Create Report Header]
    CreateHeader --> AddSummary[Add Executive Summary]
    AddSummary --> AddCharts[Add Charts & Graphs]
    AddCharts --> AddModules[Add Module Details]
    AddModules --> AddTestCases[Add Test Case List]
    AddTestCases --> AddStories[Add Story Information]
    AddStories --> FinalizeReport[Finalize PDF]
    FinalizeReport --> DownloadPDF[Download PDF File]
    DownloadPDF --> Success[Show Success Message]
    Success --> End
    
    style Start fill:#4caf50
    style FetchData fill:#2196f3
    style ProcessData fill:#ff9800
    style GenerateCharts fill:#9c27b0
    style GeneratePDF fill:#f44336
    style Success fill:#4caf50
    style End fill:#4caf50
```
