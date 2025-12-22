import { render, screen } from '@testing-library/react';
import App from './App';

describe('App Component', () => {
  it('renders the main heading', () => {
    render(<App />);
    const heading = screen.getByText('Planning Poker System');
    expect(heading).toBeInTheDocument();
  });

  it('renders the subtitle', () => {
    render(<App />);
    const subtitle = screen.getByText('Real-time collaborative story point estimation');
    expect(subtitle).toBeInTheDocument();
  });

  it('renders the room management interface', () => {
    render(<App />);
    const createRoomHeading = screen.getByText('Create New Room');
    const joinRoomHeading = screen.getByText('Join Existing Room');
    expect(createRoomHeading).toBeInTheDocument();
    expect(joinRoomHeading).toBeInTheDocument();
  });
});