// Global test utilities type declarations
import { Room, Player } from './shared-types';

declare global {
  function createMockRoom(): Room;
  function createMockPlayer(overrides?: Partial<Player>): Player;
}

export {};