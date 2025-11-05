from gherkin.parser import Parser
from gherkin.token_scanner import TokenScanner
import json

# Read the feature file
with open('test_customer_contacts.feature', 'r') as f:
    feature_text = f.read()

# Parse feature file
parser = Parser()
token_scanner = TokenScanner(feature_text)
gherkin_document = parser.parse(token_scanner)

# Get feature
feature = gherkin_document.get('feature')
print(f"Feature name: {feature.get('name')}")
print(f"\nNumber of children: {len(feature.get('children', []))}")

# Process each child
for i, child in enumerate(feature.get('children', [])):
    print(f"\n{'='*80}")
    print(f"Child {i+1}:")
    print(f"  Type: {child.get('type')}")
    print(f"  Name: {child.get('name')}")
    print(f"  Keyword: {child.get('keyword')}")
    
    # Check for examples
    examples = child.get('examples', [])
    print(f"  Examples count: {len(examples)}")
    
    if examples:
        for j, example_set in enumerate(examples):
            print(f"\n  Example set {j+1}:")
            table_header = example_set.get('tableHeader')
            table_body = example_set.get('tableBody', [])
            
            if table_header:
                columns = [cell.get('value', '') for cell in table_header.get('cells', [])]
                print(f"    Columns: {columns}")
                print(f"    Rows count: {len(table_body)}")
                
                for k, table_row in enumerate(table_body):
                    row_values = [cell.get('value', '') for cell in table_row.get('cells', [])]
                    print(f"    Row {k+1}: {row_values}")
            else:
                print("    WARNING: No table header found!")
    
    # Check steps
    steps = child.get('steps', [])
    print(f"  Steps count: {len(steps)}")
    for step in steps[:2]:  # Show first 2 steps
        print(f"    - {step.get('keyword')} {step.get('text')}")

print("\n" + "="*80)
print("\nFull document structure:")
print(json.dumps(gherkin_document, indent=2, default=str)[:2000])  # Print first 2000 chars
