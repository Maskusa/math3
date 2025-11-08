# Hexa-Core: Game & Level Editor

This is a match-3 game with a futuristic cyberpunk theme and a built-in level editor.

## Game Mechanics

### Main Goal
The goal of the game is to score as many points as possible by matching three or more identical tiles (hexes) within a limited number of moves.

### Gameplay Process
1.  **Moves:** The player can swap two adjacent tiles horizontally or vertically.
2.  **Combinations:** If this swap results in a line of three or more identical tiles, they disappear from the board.
3.  **Falling:** Tiles located above fall down to take the empty space.
4.  **New Tiles:** New tiles randomly appear at the top of the board, filling all voids.
5.  **Chain Reactions:** If the falling tiles lead to new combinations, they also disappear, bringing more points. This is called a chain reaction or cascade.

### Special Tiles
When making combinations of 4 or 5 tiles, special tiles with unique properties may appear:
*   **Bomb (◎):** When activated, destroys all tiles in a 3x3 radius around it.
*   **Vertical Laser (⬍):** Destroys the entire column of tiles.
*   **Horizontal Laser (⇔):** Destroys the entire row of tiles.
*   **Cross Laser (╋):** Destroys both the row and the column.
*   **Electricity (⚡):** Destroys all tiles of one random type on the board.
*   **Rainbow (★):** Can be used in a combination with any adjacent tile.

### Unique Tiles (Obstacles)
Unique tiles may appear on the board, which cannot be moved but can be destroyed by adjacent matches:
*   **Complex (🛡️):** Has several "lives". Requires multiple adjacent matches to be destroyed.
*   **Metal (⚙️):** An indestructible block. Can only be removed with special effects (e.g., a bomb).
*   **Stone (🪨):** Similar to "Complex," but may have different properties.

## Level Editor
The built-in editor allows you to create your own levels:
*   Set the size of the game board.
*   Place any type of tiles, including special and unique ones.
*   Save and load levels for later play or editing.

## Debug Mode
In the main menu, you can activate "ДЕБАГ МОД" (Debug Mode). If this option is enabled, detailed step-by-step information about the operation of the game mechanics will be displayed in the browser's developer console (F12):
*   Level loading and initial state of the board.
*   Each player's move and its result (successful swap or invalid move).
*   A detailed log of the game cycle: finding matches, activating special effects, removing tiles, falling, and adding new ones.

This allows you to track the game logic and ensure all mechanics are working correctly.
