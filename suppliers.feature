Feature: Supplier Management
  As a user
  I want to manage supplier profiles
  So that I can keep track of all suppliers

  Scenario: View supplier list
    Given I am logged in as an admin
    When I navigate to the suppliers page
    Then I should see the list of suppliers
    And each supplier should display their name and contact info

  Scenario: Add a new supplier
    Given I am logged in as an admin
    And I am on the suppliers page
    When I click on "Add Supplier" button
    And I fill in the supplier details
      | Field         | Value                    |
      | Name          | ABC Supplies Inc         |
      | Email         | contact@abcsupplies.com  |
      | Phone         | +1-555-0123              |
      | Address       | 123 Main St, City, State |
    And I click "Save"
    Then the supplier should be created successfully
    And I should see "ABC Supplies Inc" in the suppliers list

  Scenario: Edit supplier profile
    Given I am logged in as an admin
    And a supplier "XYZ Corp" exists
    When I navigate to "XYZ Corp" supplier profile
    And I click "Edit" button
    And I update the phone number to "+1-555-9999"
    And I click "Save"
    Then the supplier profile should be updated
    And I should see the new phone number "+1-555-9999"

  Scenario Outline: Search suppliers by different criteria
    Given I am logged in as an admin
    And I am on the suppliers page
    When I search for suppliers using "<SearchField>" with value "<SearchValue>"
    Then I should see suppliers matching the criteria
    And the results should contain "<ExpectedSupplier>"

    Examples:
      | SearchField | SearchValue      | ExpectedSupplier    |
      | Name        | ABC              | ABC Supplies Inc    |
      | Email       | xyz@             | XYZ Corp            |
      | Phone       | 555-0123         | ABC Supplies Inc    |
      | City        | New York         | NYC Suppliers Ltd   |

  Scenario: Delete supplier
    Given I am logged in as an admin
    And a supplier "Old Supplier" exists
    When I navigate to "Old Supplier" profile
    And I click "Delete" button
    And I confirm the deletion
    Then the supplier should be removed from the system
    And I should not see "Old Supplier" in the suppliers list
