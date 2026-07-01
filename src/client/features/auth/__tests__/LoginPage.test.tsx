/**
 * LoginPage component tests.
 *
 * Uses MSW to intercept /api/v1/auth/login and Testing Library to render the
 * component tree.  react-router-dom is wrapped via MemoryRouter so the test
 * doesn't need a real browser history.
 */
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { http, HttpResponse } from 'msw';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { server } from '@/test-utils/server';
import LoginPage from '../pages/LoginPage';
import { useAuthStore } from '@/store/authStore';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const theme = createTheme();

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
}

function renderLoginPage() {
  const queryClient = makeQueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <ThemeProvider theme={theme}>
        <MemoryRouter initialEntries={['/login']}>
          <LoginPage />
        </MemoryRouter>
      </ThemeProvider>
    </QueryClientProvider>,
  );
}

// ---------------------------------------------------------------------------
// Lifecycle
// ---------------------------------------------------------------------------

beforeAll(() => server.listen({ onUnhandledRequest: 'warn' }));
afterEach(() => {
  server.resetHandlers();
  useAuthStore.setState({
    user: null,
    accessToken: null,
    refreshToken: null,
    sessionId: null,
    isAuthenticated: false,
    isLoading: false,
  });
});
afterAll(() => server.close());

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('LoginPage', () => {
  it('renders the login form with email and password fields', () => {
    renderLoginPage();

    expect(screen.getByTestId('page-login')).toBeInTheDocument();
    expect(
      screen.getByRole('textbox', { name: /email address/i }),
    ).toBeInTheDocument();
    // Password field is type="password" so not a textbox role — query by label.
    expect(screen.getByLabelText(/^password/i)).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /sign in/i }),
    ).toBeInTheDocument();
  });

  it('shows the forgot password link and register link', () => {
    renderLoginPage();

    expect(
      screen.getByRole('link', { name: /forgot password/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: /create one/i }),
    ).toBeInTheDocument();
  });

  it('shows validation errors when submitting empty form', async () => {
    const user = userEvent.setup();
    renderLoginPage();

    await user.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(screen.getByText(/email is required/i)).toBeInTheDocument();
    });
  });

  it('shows loading indicator while request is in flight', async () => {
    // Use a manually-resolved promise so we fully control when the response
    // arrives. This prevents a timing race where the 200 ms timer fires inside
    // waitFor's polling window and the pending state is never observed.
    let resolveLogin!: () => void;
    const loginGate = new Promise<void>((resolve) => {
      resolveLogin = resolve;
    });

    server.use(
      http.post('/api/v1/auth/login', () => {
        // Return a promise that we resolve manually so the request hangs.
        return loginGate.then(() =>
          HttpResponse.json({
            success: true,
            data: {
              user: {
                id: '1',
                username: 'testuser',
                email: 'test@example.com',
                role: 'user',
                status: 'active',
                emailVerified: true,
                phoneVerified: false,
                twoFactorEnabled: false,
                createdAt: new Date().toISOString(),
              },
              accessToken: 'access_token',
              refreshToken: 'refresh_token',
              expiresIn: 3600,
              sessionId: 'session_1',
            },
          }),
        );
      }),
    );

    const user = userEvent.setup();
    renderLoginPage();

    await user.type(
      screen.getByRole('textbox', { name: /email address/i }),
      'test@example.com',
    );
    await user.type(screen.getByLabelText(/^password/i), 'password123');

    // Fire-and-forget the click so the pending state can be observed before
    // the network request resolves.
    void user.click(screen.getByRole('button', { name: /sign in/i }));

    // Wait for the mutation to enter pending state → button becomes disabled.
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /sign in/i })).toBeDisabled();
    });

    // Unblock the server response and wait for mutation to fully settle.
    resolveLogin();
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /sign in/i })).not.toBeDisabled();
    });
  });

  it('shows an error message on 401 invalid credentials', async () => {
    server.use(
      http.post('/api/v1/auth/login', () =>
        HttpResponse.json(
          { success: false, message: 'Invalid email or password' },
          { status: 401 },
        ),
      ),
    );

    const user = userEvent.setup();
    renderLoginPage();

    await user.type(
      screen.getByRole('textbox', { name: /email address/i }),
      'wrong@example.com',
    );
    await user.type(screen.getByLabelText(/^password/i), 'wrongpassword');
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(
        screen.getByRole('alert'),
      ).toBeInTheDocument();
    });
  });

  it('calls login mutation with correct data on submit', async () => {
    // Spy on apiService.post to capture the outgoing request body without
    // relying on MSW's request.json() (which fails for XHR-intercepted
    // requests in the jsdom environment).
    const { apiService } = await import('@/services/api');
    const postSpy = jest.spyOn(apiService, 'post');

    const user = userEvent.setup();
    renderLoginPage();

    await user.type(
      screen.getByRole('textbox', { name: /email address/i }),
      'user@example.com',
    );
    await user.type(screen.getByLabelText(/^password/i), 'mypassword');
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    // Wait for the mutation to fire then verify the request payload.
    await waitFor(() => {
      expect(postSpy).toHaveBeenCalledWith(
        '/auth/login',
        expect.objectContaining({
          email: 'user@example.com',
          password: 'mypassword',
        }),
      );
    });

    postSpy.mockRestore();
  });
});
