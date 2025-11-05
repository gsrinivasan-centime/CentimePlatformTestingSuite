Feature: Customer contacts side panel-edit-Test is to verify that user can edit customer contacts

	@TEST_CTP-2293 @TESTSET_CTP-2292 @ar_customer_contacts @ar_smoke @smoke
	Scenario: Customer contacts side panel-Gl sync-Test is to verify that all gl created contacts are properly synced and shown on side panel
		Given user is on dashboard page
		When selects full license business entity for entity_with_gl_connection on dash board page
		And click on account receivables on dash board page
		And click on customers tab on account receivables dash board page
		And click on a customer from customer table on account receivables dashboard
		And click on contacts tab from customer profile side panel
		Then validate all contacts displayed on contacts tab

 
	@TEST_CTP-2295 @TESTSET_CTP-2292 @ar_customer_contacts @ar_regression @regression
	Scenario Outline: Customer contacts side panel-edit-Test is to verify that user can edit customer contacts with roles
		Given user is on dashboard page
		When selects full license business entity for entity_with_gl_connection on dash board page
		And click on account receivables on dash board page
		And click on customers tab on account receivables dash board page
		And click on a customer from customer table on account receivables dashboard
		And click on contacts tab from customer profile side panel
		Then click on edit button of a contact with <valid_invalid_name> name and <valid_invalid_phone> and <valid_invalid_email> and <valid_invalid_role>
		Examples:
			| valid_invalid_name | valid_invalid_phone | valid_invalid_email 			| valid_invalid_role		|
			| valid				 | valid 			   | abc123@xyz.com 	 			| Communication contact		|
			| valid				 | 123456789 		   | valid 				 			| Communication contact 	|
			| valid				 | valid 			   | abc123@xyz.com,abc123@123.com	| Communication contact 	|
			| ''			 	 | 789654321 		   | abc123@xyz.com 			 	| Communication contact 	|
			| valid				 | valid 			   | valid							| Company contact 			|
			
	@TEST_CTP-2298 @TESTSET_CTP-2292 @ar_customer_contacts @ar_regression @regression
	Scenario Outline: Customer contact side panel-history: Test is to verify the history for customer contact actions
		Given user is on dashboard page
		When selects full license business entity for entity_with_gl_connection on dash board page
		And click on account receivables on dash board page
		And click on customers tab on account receivables dash board page
		And click on a customer from customer table on account receivables dashboard
		And click on contacts tab from customer profile side panel
		Then click on edit button of a contact with <valid_invalid_name> name and <valid_invalid_phone> and <valid_invalid_email> and <valid_invalid_role>
		And click on history tab from customer profile side panel
		And validate history for edited values
		Examples:
			| valid_invalid_name | valid_invalid_phone | valid_invalid_email | valid_invalid_role			|
			| valid				 | valid 			   | valid 				 | Company contact 				|
			| valid				 | valid 			   | valid 				 | Communication contact 	  	|
