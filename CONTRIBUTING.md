# Contributing to Zee-Index

Thank you for your interest in contributing to Zee-Index! We welcome contributions from the community to help improve this project.

## Getting Started

1.  **Fork the repository** to your GitHub account.
2.  **Clone the repository** to your local machine:
    ```bash
    git clone https://github.com/your-username/Zee-Index.git
    cd Zee-Index
    ```
3.  **Install dependencies**:
    ```bash
    pnpm install
    ```
4.  **Set up Environment Variables**:
    Copy `.env.example` to `.env` and fill in the required values (Google Cloud credentials, Upstash Redis, etc.).
    ```bash
    cp .env.example .env
    ```
5.  **Run the development server**:
    ```bash
    pnpm dev
    ```

## Project Structure

- `app/`: Next.js App Router pages and API routes.
- `components/`: React components (UI, features, charts).
- `lib/`: Utility functions, database configuration, and shared logic.
- `e2e/`: End-to-End tests using Playwright.
- `public/`: Static assets.

## Workflow

- **Branching**: Create a new branch for each feature or bug fix (e.g., `feat/new-dashboard`, `fix/upload-bug`).
- **Commits**: We follow the **Conventional Commits** specification (e.g., `feat: add rate limiting`, `chore: update dependencies`).
- **Linting & Formatting**: Ensure your code is linted and formatted before pushing.
  ```bash
  pnpm check:all
  ```
- **Testing**: Run unit tests and E2E tests to ensure no regressions.
  ```bash
  pnpm test
  pnpm test:e2e
  ```

## Pull Requests

1.  Push your branch to your forked repository.
2.  Open a Pull Request (PR) to the `main` branch of the original repository.
3.  Provide a clear description of your changes and link any relevant issues.
4.  Wait for review and address any feedback.

## Code Style

- Use **TypeScript** for all new code.
- Use **Tailwind CSS** for styling.
- Prioritize **Performance** and **Accessibility**.
- Keep components small and focused.

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
