import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LeadForm } from '@/components/splash/LeadForm';

// Mock framer-motion to avoid animation issues in tests
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

describe('LeadForm', () => {
  const mockOnSubmit = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders all 3 form fields', () => {
    render(<LeadForm onSubmit={mockOnSubmit} />);
    
    expect(screen.getByPlaceholderText('Seu nome completo')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('(51) 99999-9999')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('seu@email.com')).toBeInTheDocument();
  });

  it('shows validation errors when submitted empty', async () => {
    render(<LeadForm onSubmit={mockOnSubmit} />);
    
    const submitButton = screen.getByText('Ver meu resultado');
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Informe seu nome')).toBeInTheDocument();
      expect(screen.getByText('Informe um telefone válido')).toBeInTheDocument();
    });
    
    expect(mockOnSubmit).not.toHaveBeenCalled();
  });

  it('formats phone input correctly', async () => {
    render(<LeadForm onSubmit={mockOnSubmit} />);
    
    const phoneInput = screen.getByPlaceholderText('(51) 99999-9999');
    await userEvent.type(phoneInput, '51999999999');
    
    expect(phoneInput).toHaveValue('(51) 99999-9999');
  });

  it('calls onSubmit with sanitized data when form is valid', async () => {
    render(<LeadForm onSubmit={mockOnSubmit} />);
    
    await userEvent.type(screen.getByPlaceholderText('Seu nome completo'), 'João Silva');
    await userEvent.type(screen.getByPlaceholderText('(51) 99999-9999'), '51999999999');
    await userEvent.type(screen.getByPlaceholderText('seu@email.com'), 'joao@test.com');
    
    fireEvent.click(screen.getByText('Ver meu resultado'));
    
    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith({
        nome: 'João Silva',
        telefone: '51999999999',
        email: 'joao@test.com',
      });
    });
  });

  it('shows duplicate message when onCheckDuplicate returns duplicate', async () => {
    const mockCheckDuplicate = vi.fn().mockResolvedValue({
      duplicate: true,
      field: 'telefone',
      franchiseName: 'Quintal Ideal Porto Alegre',
    });

    render(<LeadForm onSubmit={mockOnSubmit} onCheckDuplicate={mockCheckDuplicate} />);
    
    await userEvent.type(screen.getByPlaceholderText('Seu nome completo'), 'João Silva');
    await userEvent.type(screen.getByPlaceholderText('(51) 99999-9999'), '51999999999');
    
    fireEvent.click(screen.getByText('Ver meu resultado'));
    
    await waitFor(() => {
      expect(screen.getByText(/já está cadastrado na franquia Quintal Ideal Porto Alegre/)).toBeInTheDocument();
    });
    
    expect(mockOnSubmit).not.toHaveBeenCalled();
  });
});
