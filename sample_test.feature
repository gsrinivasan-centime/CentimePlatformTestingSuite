Feature: User Authentication
  As a user of the application
  I want to be able to login and logout
  So that I can access my account securely

  Scenario: Successful login with valid credentials
    Given the user is on the login page
    When the user enters valid username "john.doe@example.com"
    And the user enters valid password "SecurePass123"
    And the user clicks the login button
    Then the user should be redirected to the dashboard
    And the user should see a welcome message

  Scenario: Failed login with invalid credentials
    Given the user is on the login page
    When the user enters invalid username "invalid@example.com"
    And the user enters invalid password "WrongPassword"
    And the user clicks the login button
    Then the user should see an error message "Invalid credentials"
    And the user should remain on the login page

  Scenario Outline: Login with different user roles
    Given the user is on the login page
    When the user enters username "<username>"
    And the user enters password "<password>"
    And the user clicks the login button
    Then the user should be redirected to the "<expected_page>"
    And the user role should be "<role>"

    Examples:
      | username              | password       | expected_page | role     |
      | admin@example.com     | Admin123!      | /admin        | admin    |
      | user@example.com      | User123!       | /dashboard    | user     |
      | tester@example.com    | Tester123!     | /dashboard    | tester   |
      | manager@example.com   | Manager123!    | /reports      | manager  |

  Scenario: Logout successfully
    Given the user is logged in
    When the user clicks the logout button
    Then the user should be redirected to the login page
    And the session should be cleared
