import { useCallback, useEffect, useState } from "react";
import { useActor } from "./rivet";

type Cell = 0 | 1 | 2;
type Board = Cell[][];
type Player = 1 | 2;

interface GameState {
  board: Board;
  currentPlayer: Player;
  playerCount: number;
  playerNumber: 0 | 1 | 2;
  winner: Player | null;
  isDraw: boolean;
  gameStarted: boolean;
}

function App() {
  const [roomId, setRoomId] = useState<string>("");
  const [joinedRoom, setJoinedRoom] = useState<string | null>(null);

  if (!joinedRoom) {
    return (
      <div style={styles.container}>
        <h1 style={styles.title}>Connect Four</h1>
        <div style={styles.joinForm}>
          <input
            type="text"
            placeholder="Enter room ID"
            value={roomId}
            onChange={(e) => setRoomId(e.target.value)}
            style={styles.input}
          />
          <button
            onClick={() => roomId && setJoinedRoom(roomId)}
            disabled={!roomId}
            style={styles.button}
          >
            Join Room
          </button>
          <button
            onClick={() => {
              const id = Math.random().toString(36).substring(2, 8);
              setRoomId(id);
              setJoinedRoom(id);
            }}
            style={styles.button}
          >
            Create New Room
          </button>
        </div>
      </div>
    );
  }

  return <GameRoom roomId={joinedRoom} onLeave={() => setJoinedRoom(null)} />;
}

function GameRoom({
  roomId,
  onLeave,
}: {
  roomId: string;
  onLeave: () => void;
}) {
  const actor = useActor({ name: "gameRoom", key: [roomId] });
  const [gameState, setGameState] = useState<GameState | null>(null);

  // Fetch initial state when connected
  useEffect(() => {
    if (actor.connection) {
      actor.connection.getState().then(setGameState);
    }
  }, [actor.connection]);

  // Listen for game updates
  actor.useEvent("gameUpdate", (data) => {
    setGameState((prev) =>
      prev
        ? {
            ...prev,
            board: data.board,
            currentPlayer: data.currentPlayer,
            playerCount: data.playerCount,
            winner: data.winner,
            isDraw: data.isDraw,
            gameStarted: data.gameStarted,
          }
        : null
    );
  });

  // Listen for player leaving
  actor.useEvent("playerLeft", (data) => {
    setGameState((prev) =>
      prev
        ? {
            ...prev,
            playerCount: data.playerCount,
            gameStarted: false,
          }
        : null
    );
  });

  const handleColumnClick = useCallback(
    async (column: number) => {
      if (actor.connection) {
        await actor.connection.dropPiece(column);
      }
    },
    [actor.connection]
  );

  const handleReset = useCallback(async () => {
    if (actor.connection) {
      await actor.connection.resetGame();
    }
  }, [actor.connection]);

  if (!gameState) {
    return (
      <div style={styles.container}>
        <p>Connecting to room {roomId}...</p>
      </div>
    );
  }

  const isMyTurn =
    gameState.gameStarted &&
    gameState.playerNumber === gameState.currentPlayer &&
    !gameState.winner &&
    !gameState.isDraw;

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.title}>Connect Four</h1>
        <p style={styles.roomInfo}>Room: {roomId}</p>
        <button onClick={onLeave} style={styles.leaveButton}>
          Leave Room
        </button>
      </div>

      <div style={styles.status}>
        {gameState.playerCount < 2 && (
          <p>Waiting for opponent... ({gameState.playerCount}/2 players)</p>
        )}
        {gameState.gameStarted && !gameState.winner && !gameState.isDraw && (
          <p>
            {isMyTurn ? (
              <strong>Your turn!</strong>
            ) : (
              `Player ${gameState.currentPlayer}'s turn`
            )}
          </p>
        )}
        {gameState.winner && (
          <p style={styles.winner}>
            {gameState.winner === gameState.playerNumber
              ? "You win!"
              : `Player ${gameState.winner} wins!`}
          </p>
        )}
        {gameState.isDraw && <p>It's a draw!</p>}
        <p style={styles.playerInfo}>
          You are Player {gameState.playerNumber || "spectator"}{" "}
          {gameState.playerNumber === 1 ? "(Red)" : gameState.playerNumber === 2 ? "(Yellow)" : ""}
        </p>
      </div>

      <div style={styles.board}>
        {/* Column click areas */}
        <div style={styles.columnButtons}>
          {[0, 1, 2, 3, 4, 5, 6].map((col) => (
            <button
              key={col}
              onClick={() => handleColumnClick(col)}
              disabled={!isMyTurn}
              style={{
                ...styles.columnButton,
                cursor: isMyTurn ? "pointer" : "not-allowed",
              }}
              aria-label={`Drop piece in column ${col + 1}`}
            />
          ))}
        </div>

        {/* Game board */}
        {gameState.board.map((row, rowIndex) => (
          <div key={rowIndex} style={styles.row}>
            {row.map((cell, colIndex) => (
              <div key={colIndex} style={styles.cell}>
                <div
                  style={{
                    ...styles.piece,
                    backgroundColor:
                      cell === 0
                        ? "#1a1a2e"
                        : cell === 1
                        ? "#e63946"
                        : "#ffd700",
                  }}
                />
              </div>
            ))}
          </div>
        ))}
      </div>

      {(gameState.winner || gameState.isDraw) && (
        <button onClick={handleReset} style={styles.resetButton}>
          Play Again
        </button>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    padding: "20px",
    fontFamily: "system-ui, sans-serif",
    minHeight: "100vh",
    backgroundColor: "#0f0f23",
    color: "#ffffff",
  },
  header: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    marginBottom: "20px",
  },
  title: {
    fontSize: "2.5rem",
    marginBottom: "10px",
    background: "linear-gradient(135deg, #e63946, #ffd700)",
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent",
  },
  roomInfo: {
    fontSize: "1rem",
    color: "#888",
    marginBottom: "10px",
  },
  leaveButton: {
    padding: "8px 16px",
    fontSize: "0.9rem",
    backgroundColor: "#333",
    color: "#fff",
    border: "none",
    borderRadius: "4px",
    cursor: "pointer",
  },
  status: {
    textAlign: "center",
    marginBottom: "20px",
    minHeight: "60px",
  },
  winner: {
    fontSize: "1.5rem",
    color: "#ffd700",
    fontWeight: "bold",
  },
  playerInfo: {
    fontSize: "0.9rem",
    color: "#888",
    marginTop: "10px",
  },
  board: {
    backgroundColor: "#1e40af",
    padding: "10px",
    borderRadius: "10px",
    boxShadow: "0 10px 30px rgba(0,0,0,0.5)",
  },
  columnButtons: {
    display: "flex",
    gap: "10px",
    marginBottom: "5px",
  },
  columnButton: {
    width: "60px",
    height: "30px",
    backgroundColor: "transparent",
    border: "2px dashed #3b82f6",
    borderRadius: "5px",
    opacity: 0.5,
  },
  row: {
    display: "flex",
    gap: "10px",
  },
  cell: {
    width: "60px",
    height: "60px",
    backgroundColor: "#1e40af",
    borderRadius: "50%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    margin: "5px 0",
  },
  piece: {
    width: "50px",
    height: "50px",
    borderRadius: "50%",
    transition: "background-color 0.2s ease",
    boxShadow: "inset 0 -3px 6px rgba(0,0,0,0.3)",
  },
  joinForm: {
    display: "flex",
    flexDirection: "column",
    gap: "15px",
    alignItems: "center",
    marginTop: "40px",
  },
  input: {
    padding: "12px 20px",
    fontSize: "1rem",
    borderRadius: "8px",
    border: "2px solid #333",
    backgroundColor: "#1a1a2e",
    color: "#fff",
    width: "250px",
    textAlign: "center",
  },
  button: {
    padding: "12px 30px",
    fontSize: "1rem",
    backgroundColor: "#1e40af",
    color: "#fff",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
    width: "250px",
  },
  resetButton: {
    marginTop: "20px",
    padding: "12px 30px",
    fontSize: "1rem",
    backgroundColor: "#059669",
    color: "#fff",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
  },
};

export default App;
