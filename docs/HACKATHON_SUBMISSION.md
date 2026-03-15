# SmartDiet Copilot - Hackathon Submission

## Inspiration

Most people want to eat healthier, waste less food, and spend less on groceries.  
Yet one daily question is still hard:

**"What should I eat today?"**

When users stand in front of the fridge, they often cannot tell whether the next meal fits their calorie target, macro goals, dietary preferences, or allergy constraints. At the same time, people lose track of ingredients they already bought, which leads to expired food and unnecessary grocery spending.

Food decisions are personal, but most nutrition apps are still passive trackers. They log what users already ate, but do not actively decide what users should eat next based on real pantry state.

This gap inspired us to build an AI system that can make real-time, personalized food decisions from multimodal input and continuously adapt as the user context changes.

## What It Does

SmartDiet Copilot is an **agentic AI assistant** that combines a personal dietitian and a grocery-aware planner.

Users can:

- Set goals and constraints (maintenance, fat loss, muscle gain)
- Configure allergies, dietary preferences, cook-time limits, and budget targets
- Upload a **fridge photo**, **meal photo**, or **grocery receipt**
- Ask for custom replanning through **chat**

The system will:

- Detect and normalize ingredients from multimodal input
- Track pantry state and spoilage urgency
- Estimate meal nutrition and update daily intake context
- Generate personalized recommendations constrained by nutrition, time, budget, and available ingredients
- Return actionable outputs: recipe suggestion, steps, nutrition summary, substitutions, missing ingredients, and grocery gap

As users continue scanning and chatting, the agent updates memory and replans, creating a practical feedback loop instead of one-shot generic advice.

## How We Built It

We built a multimodal, tool-augmented agent architecture with a production-oriented web stack.

### System Pipeline

1. User inputs arrive via scan endpoints (fridge / meal / receipt) and chat.
2. Backend creates async input jobs and parses payloads.
3. Gemini multimodal parsing extracts structured items and nutrition hints.
4. Pantry and meal context are normalized and persisted per user.
5. Railtracks agent runs a ReAct-style planning loop:
   `Perceive -> Prioritize -> Retrieve -> Query -> Formulate -> Reflect -> Finalize`.
6. Retrieval and constraint checks produce grounded recommendations.
7. Execution plan and recommendation bundle are returned to the UI and stored for history/replanning.

### Tech Stack (Current Implementation)

| Layer | Stack |
| --- | --- |
| Frontend | Next.js 14 (App Router), React 18, Tailwind CSS |
| Backend API | FastAPI, Pydantic, SQLAlchemy, Uvicorn |
| Agent Orchestration | Railtracks (stage-based ReAct workflow) |
| LLM / Vision / Embedding | Google Gemini API (`gemini-2.5-pro`, `gemini-embedding-001`) |
| Retrieval | ChromaDB vector store (via Railtracks) + recipe API metadata |
| Auth | AWS Cognito (email OTP + JWT verification) |
| Storage | SQLite (memory/file mode + snapshot persistence) |
| Async Jobs | FastAPI BackgroundTasks |
| Deployment | Frontend on Vercel, Backend on EC2 + Nginx + systemd |
| CI/CD | GitHub Actions backend deploy workflow (SSH deploy to EC2) |

### Key Architecture Decisions

- **Agent-first design**: We implemented explicit planning stages, not a plain chatbot.
- **Multimodal ingestion**: Fridge/meal/receipt inputs are first-class citizens in planning.
- **Constraint-based planning**: Calories, macros, spoilage, time, budget, and allergies are evaluated together.
- **User isolation**: JWT-protected endpoints and per-user data partitioning.

## Challenges We Ran Into

- **Agent orchestration reliability**: Coordinating perception, retrieval, planning, and reflection across multiple stages.
- **Real-world image ambiguity**: Fridge photos are noisy, cluttered, and partially occluded.
- **Multi-objective optimization**: Nutrition, spoilage, time, and cost frequently conflict.
- **Hackathon velocity constraints**: Shipping a working end-to-end product while still keeping architecture extensible.

## Accomplishments We Are Proud Of

- Built a true **agentic workflow** with staged reasoning and tool execution.
- Integrated **multimodal understanding** for fridge, meal, and receipt inputs.
- Combined **health optimization + waste reduction + budget awareness** in one planner.
- Delivered a practical **decision-to-action output**, not just recipe text.
- Implemented an extensible architecture that can absorb new tools and signals.

## What We Learned

- High-quality agent behavior requires clear boundaries between planning, retrieval, memory, and execution.
- Multimodal input dramatically reduces user friction versus manual logging.
- Constraint balancing is essential for practical recommendations in real daily contexts.
- Operational details (auth, CORS, deployment, observability, timeout handling) matter as much as model quality for a reliable product demo.

## What's Next

- Integrate wearable and health signals (sleep, activity, recovery).
- Improve retrieval diversity and portion control.
- Add deeper meal-prep scheduling and calendar sync workflows.
- Connect shopping flows for automatic missing-ingredient fulfillment.
- Add collaborative/social features around meal plans and sustainability metrics.
