import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ProtectedRoute } from '@/components/ProtectedRoute';

// Mock useAuth
const mockUseAuth = vi.fn();
vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => mockUseAuth(),
}));

// Mock Navigate
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    Navigate: (props: any) => {
      mockNavigate(props);
      return null;
    },
  };
});

describe('ProtectedRoute', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows loading spinner when auth is loading', () => {
    mockUseAuth.mockReturnValue({ user: null, role: null, loading: true });

    render(
      <MemoryRouter>
        <ProtectedRoute><div>Protected Content</div></ProtectedRoute>
      </MemoryRouter>
    );

    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
  });

  it('redirects to /login when no user', () => {
    mockUseAuth.mockReturnValue({ user: null, role: null, loading: false });

    render(
      <MemoryRouter>
        <ProtectedRoute><div>Protected Content</div></ProtectedRoute>
      </MemoryRouter>
    );

    expect(mockNavigate).toHaveBeenCalledWith(expect.objectContaining({ to: '/login', replace: true }));
    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
  });

  it('renders children when user has allowed role', () => {
    mockUseAuth.mockReturnValue({ user: { id: '1' }, role: 'admin_fabrica', loading: false });

    render(
      <MemoryRouter>
        <ProtectedRoute allowedRoles={['admin_fabrica']}>
          <div>Protected Content</div>
        </ProtectedRoute>
      </MemoryRouter>
    );

    expect(screen.getByText('Protected Content')).toBeInTheDocument();
  });

  it('redirects to /painel when role is not allowed', () => {
    mockUseAuth.mockReturnValue({ user: { id: '1' }, role: 'franquia', loading: false });

    render(
      <MemoryRouter>
        <ProtectedRoute allowedRoles={['admin_fabrica']}>
          <div>Protected Content</div>
        </ProtectedRoute>
      </MemoryRouter>
    );

    expect(mockNavigate).toHaveBeenCalledWith(expect.objectContaining({ to: '/painel', replace: true }));
    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
  });
});
