# Local Questions Documentation

This document describes the format for local question sets and how to add or modify questions.

## Question File Format

Local questions are stored in JSON format at `public/data/farcaster_questions.json`. The file contains an array of question objects.

### Question Object Structure

Each question must have the following fields:

```json
{
  "id": "unique_identifier_001",
  "question": "What is the question text?",
  "options": [
    "Option 1",
    "Option 2",
    "Option 3",
    "Option 4"
  ],
  "answer": 0,
  "explanation": "Optional explanation of the correct answer",
  "tags": ["tag1", "tag2", "tag3"]
}
```

### Field Descriptions

- **id** (required): A unique string identifier for the question. Use a descriptive format like `farcaster_001`, `protocol_042`, etc.
- **question** (required): The question text as a string
- **options** (required): An array of 2-6 answer choices (typically 4)
- **answer** (required): Zero-based index of the correct answer in the options array (0 for first option, 1 for second, etc.)
- **explanation** (optional): Additional context or explanation of the answer
- **tags** (optional): Array of tags for categorization and filtering. Common tags:
  - `farcaster` - General Farcaster questions
  - `protocol` - Protocol-specific technical questions
  - `creators` - Questions about creators and personalities
  - `warpcast` - Warpcast client specific
  - `frames` - Farcaster Frames
  - `hard` - Difficult questions
  - `basics` - Beginner-friendly questions
  - `community` - Community culture and norms
  - `technical` - Technical implementation details

## Adding New Questions

To add new questions to the quiz:

1. Open `public/data/farcaster_questions.json`
2. Add your question object to the array
3. Ensure the `id` is unique and not already used
4. Verify the `answer` index correctly points to the right option
5. Add appropriate `tags` for filtering
6. Save the file

### Example: Adding a New Question

```json
{
  "id": "farcaster_101",
  "question": "What is the main advantage of Farcaster's hybrid approach?",
  "options": [
    "It's faster than fully on-chain solutions",
    "It balances decentralization with good user experience",
    "It's cheaper than other protocols",
    "It uses less bandwidth"
  ],
  "answer": 1,
  "explanation": "Farcaster uses a hybrid approach to achieve sufficient decentralization while maintaining excellent UX.",
  "tags": ["farcaster", "protocol", "hard"]
}
```

## Best Practices

1. **Clear Questions**: Make questions unambiguous and clearly worded
2. **Appropriate Difficulty**: Use tags to mark difficulty levels
3. **Accurate Answers**: Double-check that the answer index is correct
4. **Meaningful Explanations**: Provide explanations that add value and context
5. **Consistent Formatting**: Follow the JSON structure exactly
6. **Valid JSON**: Validate your JSON after making changes (use a JSON validator)
7. **Unique IDs**: Always use unique identifiers for new questions

## Testing Questions

After adding or modifying questions:

1. Validate the JSON file using a JSON validator
2. Run the application locally: `npm run dev`
3. Select "Farcaster Knowledge (Local)" as the question source
4. Start a quiz and verify your questions appear correctly
5. Check that all options display properly
6. Verify the correct answer is marked correctly

## Filtering by Tags

Questions can be filtered by tags when loaded. The question loader supports filtering by one or more tags. This allows for:

- Difficulty-based quizzes (using `hard`, `basics` tags)
- Topic-specific quizzes (using `frames`, `protocol`, etc.)
- Themed quiz collections

To use tag filtering, modify the API call in the application code to include tag parameters.

## Maintaining Question Quality

- Review questions periodically for accuracy
- Update questions as the Farcaster protocol evolves
- Remove outdated questions
- Ensure diverse difficulty levels
- Maintain balanced topic coverage

## File Location

The question file must be located at:
```
public/data/farcaster_questions.json
```

This location makes it accessible via the public URL `/data/farcaster_questions.json` in the Next.js application.

## Troubleshooting

**Questions not appearing:**
- Check JSON syntax is valid
- Verify file is in correct location (`public/data/`)
- Check browser console for loading errors

**Wrong answer marked as correct:**
- Verify `answer` index matches intended option (remember: 0-based indexing)
- Check that options array is in the expected order

**Tags not working:**
- Ensure tags are in array format: `["tag1", "tag2"]`
- Check spelling of tag names
