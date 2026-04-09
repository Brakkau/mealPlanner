# Meal Planner App - Local Development Guide

A meal planning application built with Next.js, Prisma, and PostgreSQL that generates AI-powered meal plans with British/metric measurements.

## Features

- 🍽️ AI-powered meal plan generation with customizable options
- 📱 Mobile-first responsive design
- 🛒 Automatic shopping list generation with ingredient aggregation
- 📸 Recipe upload via image OCR
- ⭐ Favourite recipes system
- 📊 Cooking progress tracking
- 🇬🇧 British/metric measurements (g, kg, ml, L)

## Prerequisites

- **Node.js** 18.x or higher
- **Yarn** package manager
- **PostgreSQL** 14.x or higher
- **OpenAI API key** or compatible LLM API (e.g., Abacus.AI)

## Quick Start

### 1. Clone/Copy the Project

```bash
# Copy the nextjs_space folder to your local machine
cp -r nextjs_space meal-planner
cd meal-planner
```

### 2. Install Dependencies

```bash
yarn install
```

### 3. Set Up PostgreSQL Database

```bash
# Create a new PostgreSQL database
createdb meal_planner

# Or via psql
psql -U postgres -c "CREATE DATABASE meal_planner;"
```

### 4. Configure Environment Variables

Create a `.env` file in the project root:

```env
# Database
DATABASE_URL="postgresql://username:password@localhost:5432/meal_planner"

# LLM API (choose one option below)

# Option A: OpenAI
ABACUSAI_API_KEY="your-openai-api-key"
# Note: You'll need to update the API endpoint in the code to use OpenAI's URL

# Option B: Abacus.AI (default)
ABACUSAI_API_KEY="your-abacus-api-key"

# Option C: Any OpenAI-compatible API
# ABACUSAI_API_KEY="your-api-key"
# Update LLM_API_URL in the code as needed

# AWS S3 (Optional - for image uploads)
# If not configured, image upload will be disabled
AWS_BUCKET_NAME="your-bucket-name"
AWS_FOLDER_PREFIX="meal-planner/"
AWS_REGION="eu-west-2"
AWS_ACCESS_KEY_ID="your-access-key"
AWS_SECRET_ACCESS_KEY="your-secret-key"
```

### 5. Set Up Database Schema

```bash
# Generate Prisma client
yarn prisma generate

# Push schema to database
yarn prisma db push

# (Optional) Seed with sample data
yarn prisma db seed
```

### 6. Run the Development Server

```bash
yarn dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Using OpenAI Instead of Abacus.AI

To use OpenAI's API instead, update the API endpoints in these files:

1. `app/api/meal-plan/generate/route.ts`
2. `app/api/meal-plan/swap/route.ts`
3. `app/api/recipes/upload-image/route.ts`

Change:
```typescript
const response = await fetch('https://apps.abacus.ai/v1/chat/completions', {
```

To:
```typescript
const response = await fetch('https://api.openai.com/v1/chat/completions', {
```

And update the model name from `gpt-4.1-mini` to `gpt-4o-mini` or your preferred model.

## Project Structure

```
meal-planner/
├── app/
│   ├── api/
│   │   ├── meal-plan/
│   │   │   ├── generate/     # AI meal plan generation
│   │   │   ├── swap/         # Swap individual meals
│   │   │   ├── save/         # Save as current plan
│   │   │   ├── current/      # Get current plan
│   │   │   └── custom/       # Custom meal plans
│   │   ├── meal/
│   │   │   └── [id]/cooked/  # Toggle cooked status
│   │   ├── recipes/
│   │   │   ├── upload-image/ # OCR recipe upload
│   │   │   └── [id]/         # Recipe CRUD
│   │   └── meal-plans/       # History management
│   ├── page.tsx              # Home - meal plan generator
│   ├── meal-plan/            # View generated plan
│   ├── current-plan/         # Active cooking tracker
│   ├── shopping-list/        # Shopping list
│   ├── recipes/              # Recipe library
│   ├── favourites/           # Favourite recipes
│   └── past-plans/           # Meal plan history
├── components/
│   ├── navigation.tsx        # Main navigation
│   ├── recipe-card.tsx       # Recipe display component
│   └── changelog-modal.tsx   # Version info modal
├── lib/
│   ├── context.tsx           # Global state (meal plan, shopping list)
│   ├── db.ts                  # Prisma client
│   ├── types.ts               # TypeScript interfaces
│   ├── changelog.ts           # Version history
│   └── s3.ts                  # S3 helpers (optional)
├── prisma/
│   └── schema.prisma          # Database schema
└── .env                        # Environment variables
```

## Database Schema

```prisma
model Recipe {
  id           String   @id @default(uuid())
  title        String
  ingredients  Json     // Array of {name, quantity, unit, category}
  steps        String[]
  prepTime     Int
  cookTime     Int
  servings     Int
  isFavourite  Boolean  @default(false)
  isGenerated  Boolean  @default(true)
  createdAt    DateTime @default(now())
  meals        Meal[]
}

model MealPlan {
  id        String   @id @default(uuid())
  days      Int
  people    Int
  type      String   // Quick, High Protein, Vegetarian, etc.
  meals     Meal[]
  isSaved   Boolean  @default(false)  // Is this the current plan?
  createdAt DateTime @default(now())
}

model Meal {
  id         String   @id @default(uuid())
  recipe     Recipe   @relation(...)
  recipeId   String
  dayNumber  Int
  mealPlan   MealPlan @relation(...)
  mealPlanId String
  isCooked   Boolean  @default(false)  // Cooking progress
}
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/meal-plan/generate` | Generate AI meal plan |
| POST | `/api/meal-plan/swap` | Swap a meal |
| POST | `/api/meal-plan/save` | Save as current plan |
| GET | `/api/meal-plan/current` | Get current plan |
| DELETE | `/api/meal-plan/current` | Clear current plan |
| POST | `/api/meal/[id]/cooked` | Toggle cooked status |
| GET | `/api/recipes` | List all recipes |
| POST | `/api/recipes/upload-image` | OCR recipe from image |
| POST | `/api/recipes/[id]/favourite` | Toggle favourite |
| DELETE | `/api/recipes/[id]` | Delete recipe |
| GET | `/api/meal-plans` | List past plans |
| DELETE | `/api/meal-plans?id=xxx` | Delete past plan |

## Building for Production

```bash
# Build the application
yarn build

# Start production server
yarn start
```

## Disabling S3 (Image Upload)

If you don't need image upload functionality, you can skip the AWS configuration. The app will work without it, but the "Upload Recipe Image" feature will be disabled.

To fully remove S3 dependency:
1. Remove `lib/aws-config.ts` and `lib/s3.ts`
2. Remove `@aws-sdk/client-s3` and `@aws-sdk/s3-request-presigner` from dependencies
3. Update `app/api/recipes/upload-image/route.ts` to handle base64 directly without S3

## Customization

### Changing Meal Types

Edit `app/api/meal-plan/generate/route.ts`:

```typescript
const MEAL_TYPES: Record<string, string> = {
  Quick: "quick and easy meals that take under 30 minutes",
  "High Protein": "high protein meals with lean meats, eggs, legumes, or tofu",
  // Add your own types here
};
```

### Switching to Imperial Units

Update the prompts in:
- `app/api/meal-plan/generate/route.ts`
- `app/api/meal-plan/swap/route.ts`
- `app/api/recipes/upload-image/route.ts`

Replace the British measurement instruction with:
```
Use US imperial measurements (cups, ounces, pounds, tablespoons, teaspoons).
```

## Troubleshooting

### Database Connection Issues
```bash
# Check PostgreSQL is running
pg_isready

# Verify connection string
psql "postgresql://username:password@localhost:5432/meal_planner"
```

### Prisma Issues
```bash
# Reset database (WARNING: deletes all data)
yarn prisma db push --force-reset

# Regenerate client
yarn prisma generate
```

### API Key Issues
- Ensure `ABACUSAI_API_KEY` is set in `.env`
- Restart the dev server after changing `.env`
- Check API endpoint URL matches your provider

## Version History

See `lib/changelog.ts` for full version history.

**Current Version: 1.3.0**
- British/metric measurements for all recipes
- Current meal plan with cooking progress tracker
- Past meal plans history
- Recipe OCR with imperial-to-metric conversion

## License

MIT
