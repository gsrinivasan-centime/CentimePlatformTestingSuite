Feature: Shopping Cart Functionality
  As a customer
  I want to manage items in my shopping cart
  So that I can purchase products

  Scenario: Add single item to cart
    Given the user is on the product page
    When the user clicks "Add to Cart" for "Laptop"
    Then the cart should contain 1 item
    And the cart total should be "$999.99"

  Scenario Outline: Add multiple items with different quantities
    Given the user has an empty cart
    When the user adds <quantity> units of "<product>" priced at <price>
    Then the cart should contain <quantity> units of "<product>"
    And the subtotal for "<product>" should be <subtotal>

    Examples:
      | product           | quantity | price    | subtotal  |
      | Laptop            | 2        | $999.99  | $1999.98  |
      | Mouse             | 5        | $25.00   | $125.00   |
      | Keyboard          | 1        | $75.50   | $75.50    |
      | Monitor           | 3        | $299.00  | $897.00   |
      | USB Cable         | 10       | $5.99    | $59.90    |

  Scenario Outline: Apply discount codes
    Given the user has items worth <cart_value> in the cart
    When the user applies discount code "<discount_code>"
    Then the discount of <discount_amount> should be applied
    And the final total should be <final_total>

    Examples:
      | cart_value | discount_code | discount_amount | final_total |
      | $100.00    | SAVE10        | $10.00          | $90.00      |
      | $250.00    | SAVE20        | $50.00          | $200.00     |
      | $500.00    | FREESHIP      | $15.00          | $485.00     |
      | $1000.00   | VIP50         | $500.00         | $500.00     |

  Scenario: Remove item from cart
    Given the user has "Laptop" in the cart
    When the user removes "Laptop" from the cart
    Then the cart should be empty
    And the cart total should be "$0.00"
