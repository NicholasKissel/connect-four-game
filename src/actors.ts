import { actor, setup } from "rivetkit";

// Connect Four: 7 columns x 6 rows
// 0 = empty, 1 = player 1 (red), 2 = player 2 (yellow)
type Cell = 0 | 1 | 2;
type Board = Cell[][];
type Player = 1 | 2;

interface GameState {
  board: Board;
  currentPlayer: Player;
  players: string[]; // connection IDs of players
  winner: Player | null;
  isDraw: boolean;
  gameStarted: boolean;
}

function createEmptyBoard(): Board {
  return Array(6)
    .fill(null)
    .map(() => Array(7).fill(0));
}

function checkWinner(board: Board): Player | null {
  const rows = 6;
  const cols = 7;

  // Check horizontal
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col <= cols - 4; col++) {
      const cell = board[row][col];
      if (
        cell !== 0 &&
        cell === board[row][col + 1] &&
        cell === board[row][col + 2] &&
        cell === board[row][col + 3]
      ) {
        return cell;
      }
    }
  }

  // Check vertical
  for (let row = 0; row <= rows - 4; row++) {
    for (let col = 0; col < cols; col++) {
      const cell = board[row][col];
      if (
        cell !== 0 &&
        cell === board[row + 1][col] &&
        cell === board[row + 2][col] &&
        cell === board[row + 3][col]
      ) {
        return cell;
      }
    }
  }

  // Check diagonal (down-right)
  for (let row = 0; row <= rows - 4; row++) {
    for (let col = 0; col <= cols - 4; col++) {
      const cell = board[row][col];
      if (
        cell !== 0 &&
        cell === board[row + 1][col + 1] &&
        cell === board[row + 2][col + 2] &&
        cell === board[row + 3][col + 3]
      ) {
        return cell;
      }
    }
  }

  // Check diagonal (up-right)
  for (let row = 3; row < rows; row++) {
    for (let col = 0; col <= cols - 4; col++) {
      const cell = board[row][col];
      if (
        cell !== 0 &&
        cell === board[row - 1][col + 1] &&
        cell === board[row - 2][col + 2] &&
        cell === board[row - 3][col + 3]
      ) {
        return cell;
      }
    }
  }

  return null;
}

function isBoardFull(board: Board): boolean {
  return board[0].every((cell) => cell !== 0);
}

export const gameRoom = actor({
  state: {
    board: createEmptyBoard(),
    currentPlayer: 1 as Player,
    players: [] as string[],
    winner: null as Player | null,
    isDraw: false,
    gameStarted: false,
  },

  onConnect: (c) => {
    const state = c.state;

    // Add player if room not full
    if (state.players.length < 2 && !state.players.includes(c.conn.id)) {
      state.players.push(c.conn.id);

      // Start game when 2 players join
      if (state.players.length === 2) {
        state.gameStarted = true;
      }

      c.broadcast("gameUpdate", {
        board: state.board,
        currentPlayer: state.currentPlayer,
        playerCount: state.players.length,
        winner: state.winner,
        isDraw: state.isDraw,
        gameStarted: state.gameStarted,
      });
    }
  },

  onDisconnect: (c, conn) => {
    const state = c.state;
    const index = state.players.indexOf(conn.id);
    if (index !== -1) {
      state.players.splice(index, 1);
      state.gameStarted = false;

      c.broadcast("playerLeft", {
        playerCount: state.players.length,
      });
    }
  },

  actions: {
    getState: (c) => {
      const playerNumber = c.state.players.indexOf(c.conn.id) + 1;
      return {
        board: c.state.board,
        currentPlayer: c.state.currentPlayer,
        playerCount: c.state.players.length,
        playerNumber: playerNumber as 0 | 1 | 2,
        winner: c.state.winner,
        isDraw: c.state.isDraw,
        gameStarted: c.state.gameStarted,
      };
    },

    dropPiece: (c, column: number) => {
      const state = c.state;

      // Validate game state
      if (!state.gameStarted) {
        return { success: false, error: "Game not started" };
      }
      if (state.winner || state.isDraw) {
        return { success: false, error: "Game is over" };
      }

      // Validate player turn
      const playerIndex = state.players.indexOf(c.conn.id);
      if (playerIndex === -1) {
        return { success: false, error: "Not a player" };
      }
      if (playerIndex + 1 !== state.currentPlayer) {
        return { success: false, error: "Not your turn" };
      }

      // Validate column
      if (column < 0 || column > 6) {
        return { success: false, error: "Invalid column" };
      }

      // Find the lowest empty row in the column
      let targetRow = -1;
      for (let row = 5; row >= 0; row--) {
        if (state.board[row][column] === 0) {
          targetRow = row;
          break;
        }
      }

      if (targetRow === -1) {
        return { success: false, error: "Column is full" };
      }

      // Place the piece
      state.board[targetRow][column] = state.currentPlayer;

      // Check for winner
      const winner = checkWinner(state.board);
      if (winner) {
        state.winner = winner;
      } else if (isBoardFull(state.board)) {
        state.isDraw = true;
      } else {
        // Switch turns
        state.currentPlayer = state.currentPlayer === 1 ? 2 : 1;
      }

      // Broadcast update to all connected clients
      c.broadcast("gameUpdate", {
        board: state.board,
        currentPlayer: state.currentPlayer,
        playerCount: state.players.length,
        winner: state.winner,
        isDraw: state.isDraw,
        gameStarted: state.gameStarted,
      });

      return { success: true };
    },

    resetGame: (c) => {
      const state = c.state;

      // Only allow players to reset
      if (!state.players.includes(c.conn.id)) {
        return { success: false, error: "Not a player" };
      }

      state.board = createEmptyBoard();
      state.currentPlayer = 1;
      state.winner = null;
      state.isDraw = false;

      c.broadcast("gameUpdate", {
        board: state.board,
        currentPlayer: state.currentPlayer,
        playerCount: state.players.length,
        winner: state.winner,
        isDraw: state.isDraw,
        gameStarted: state.gameStarted,
      });

      return { success: true };
    },
  },
});

export const registry = setup({
  use: { gameRoom },
});

export type Registry = typeof registry;
