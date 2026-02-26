// Map validation script
const GRID_COLS = 9, GRID_ROWS = 12;
const CELL_EMPTY=0, CELL_PATH=1, CELL_BASE=2, CELL_SPAWN=3, CELL_WALL=4;

function validateMapData(mapData) {
  const errors = [];
  if (!mapData.id) errors.push("id missing");
  if (!mapData.grid) errors.push("grid missing");
  if (!mapData.waypoints) errors.push("waypoints missing");
  if (!mapData.spawnPos) errors.push("spawnPos missing");
  if (!mapData.basePos) errors.push("basePos missing");
  if (errors.length > 0) return { valid: false, errors };
  const { grid, waypoints, spawnPos, basePos } = mapData;
  if (grid.length !== GRID_ROWS) errors.push("Grid rows=" + grid.length + ", expected " + GRID_ROWS);
  for (let r = 0; r < grid.length; r++) {
    if (grid[r].length !== GRID_COLS) errors.push("Row " + r + " cols=" + grid[r].length);
  }
  const validCells = new Set([CELL_EMPTY, CELL_PATH, CELL_BASE, CELL_SPAWN, CELL_WALL]);
  for (let r = 0; r < grid.length; r++) {
    for (let c = 0; c < (grid[r]?.length || 0); c++) {
      if (!validCells.has(grid[r][c])) errors.push("grid[" + r + "][" + c + "] invalid=" + grid[r][c]);
    }
  }
  if (grid[spawnPos.row]?.[spawnPos.col] !== CELL_SPAWN) errors.push("spawnPos no SPAWN cell");
  if (grid[basePos.row]?.[basePos.col] !== CELL_BASE) errors.push("basePos no BASE cell");
  if (waypoints.length < 2) errors.push("waypoints < 2");
  for (let i = 1; i < waypoints.length; i++) {
    const prev = waypoints[i - 1], curr = waypoints[i];
    const dc = Math.abs(curr.col - prev.col), dr = Math.abs(curr.row - prev.row);
    if (dc + dr !== 1) errors.push("wp " + (i-1) + "->" + i + " not adjacent dc=" + dc + " dr=" + dr);
  }
  if (waypoints[0].col !== spawnPos.col || waypoints[0].row !== spawnPos.row) errors.push("first wp != spawnPos");
  const last = waypoints[waypoints.length - 1];
  if (last.col !== basePos.col || last.row !== basePos.row) errors.push("last wp != basePos");

  // Check waypoint cells are PATH or SPAWN or BASE
  for (let i = 0; i < waypoints.length; i++) {
    const wp = waypoints[i];
    const cell = grid[wp.row]?.[wp.col];
    if (cell !== CELL_PATH && cell !== CELL_SPAWN && cell !== CELL_BASE) {
      errors.push("wp " + i + " at (" + wp.col + "," + wp.row + ") is not P/S/B, cell=" + cell);
    }
  }

  // Check spawn on row 0, base on row 11
  if (spawnPos.row !== 0) errors.push("spawnPos not on row 0");
  if (basePos.row !== 11) errors.push("basePos not on row 11");

  return { valid: errors.length === 0, errors };
}

const E=0,P=1,B=2,S=3,W=4;

const maps = [
  // Desert d2_m3
  { id:"d2_m3", totalWaves:12, grid: [[W,W,S,W,W,W,W,W,W],[E,E,P,E,E,E,E,E,E],[E,E,P,P,P,P,P,E,E],[E,E,E,E,E,E,P,E,E],[E,E,E,E,E,E,P,E,E],[E,E,E,E,E,E,P,E,E],[E,E,E,E,E,E,P,E,E],[E,E,P,P,P,P,P,E,E],[E,E,P,E,E,E,E,E,E],[E,E,P,E,E,E,E,E,E],[E,E,P,E,E,E,E,E,E],[W,W,B,W,W,W,W,W,W]], waypoints:[{col:2,row:0},{col:2,row:1},{col:2,row:2},{col:3,row:2},{col:4,row:2},{col:5,row:2},{col:6,row:2},{col:6,row:3},{col:6,row:4},{col:6,row:5},{col:6,row:6},{col:6,row:7},{col:5,row:7},{col:4,row:7},{col:3,row:7},{col:2,row:7},{col:2,row:8},{col:2,row:9},{col:2,row:10},{col:2,row:11}], spawnPos:{col:2,row:0}, basePos:{col:2,row:11} },
  // Desert d2_m4
  { id:"d2_m4", totalWaves:13, grid: [[W,W,W,W,W,W,W,S,W],[E,E,E,E,E,E,E,P,E],[E,P,P,P,P,P,P,P,E],[E,P,E,E,E,E,E,E,E],[E,P,P,P,P,P,P,P,E],[E,E,E,E,E,E,E,P,E],[E,E,E,E,E,E,E,P,E],[E,P,P,P,P,P,P,P,E],[E,P,E,E,E,E,E,E,E],[E,P,E,E,E,E,E,E,E],[E,P,E,E,E,E,E,E,E],[W,B,W,W,W,W,W,W,W]], waypoints:[{col:7,row:0},{col:7,row:1},{col:7,row:2},{col:6,row:2},{col:5,row:2},{col:4,row:2},{col:3,row:2},{col:2,row:2},{col:1,row:2},{col:1,row:3},{col:1,row:4},{col:2,row:4},{col:3,row:4},{col:4,row:4},{col:5,row:4},{col:6,row:4},{col:7,row:4},{col:7,row:5},{col:7,row:6},{col:7,row:7},{col:6,row:7},{col:5,row:7},{col:4,row:7},{col:3,row:7},{col:2,row:7},{col:1,row:7},{col:1,row:8},{col:1,row:9},{col:1,row:10},{col:1,row:11}], spawnPos:{col:7,row:0}, basePos:{col:1,row:11} },
  // Desert d2_m5
  { id:"d2_m5", totalWaves:14, grid: [[S,W,W,W,W,W,W,W,W],[P,E,E,E,E,E,E,E,E],[P,P,P,P,P,P,P,P,E],[E,E,E,E,E,E,E,P,E],[E,E,E,E,E,E,E,P,E],[E,P,P,P,P,P,P,P,E],[E,P,E,E,E,E,E,E,E],[E,P,E,E,E,E,E,E,E],[E,P,P,P,P,P,P,P,E],[E,E,E,E,E,E,E,P,E],[E,E,E,E,E,E,E,P,E],[W,W,W,W,W,W,W,B,W]], waypoints:[{col:0,row:0},{col:0,row:1},{col:0,row:2},{col:1,row:2},{col:2,row:2},{col:3,row:2},{col:4,row:2},{col:5,row:2},{col:6,row:2},{col:7,row:2},{col:7,row:3},{col:7,row:4},{col:7,row:5},{col:6,row:5},{col:5,row:5},{col:4,row:5},{col:3,row:5},{col:2,row:5},{col:1,row:5},{col:1,row:6},{col:1,row:7},{col:1,row:8},{col:2,row:8},{col:3,row:8},{col:4,row:8},{col:5,row:8},{col:6,row:8},{col:7,row:8},{col:7,row:9},{col:7,row:10},{col:7,row:11}], spawnPos:{col:0,row:0}, basePos:{col:7,row:11} },
  // Desert d2_m6
  { id:"d2_m6", totalWaves:15, grid: [[W,S,W,W,W,W,W,W,W],[E,P,E,E,E,E,E,E,E],[E,P,P,P,P,P,P,P,E],[E,E,E,E,E,E,E,P,E],[E,E,P,P,P,P,P,P,E],[E,E,P,E,E,E,E,E,E],[E,E,P,P,P,P,E,E,E],[E,E,E,E,E,P,E,E,E],[E,E,E,E,E,P,E,E,E],[E,E,E,P,P,P,E,E,E],[E,E,E,P,E,E,E,E,E],[W,W,W,B,W,W,W,W,W]], waypoints:[{col:1,row:0},{col:1,row:1},{col:1,row:2},{col:2,row:2},{col:3,row:2},{col:4,row:2},{col:5,row:2},{col:6,row:2},{col:7,row:2},{col:7,row:3},{col:7,row:4},{col:6,row:4},{col:5,row:4},{col:4,row:4},{col:3,row:4},{col:2,row:4},{col:2,row:5},{col:2,row:6},{col:3,row:6},{col:4,row:6},{col:5,row:6},{col:5,row:7},{col:5,row:8},{col:5,row:9},{col:4,row:9},{col:3,row:9},{col:3,row:10},{col:3,row:11}], spawnPos:{col:1,row:0}, basePos:{col:3,row:11} },
  // Tundra t3_m2
  { id:"t3_m2", totalWaves:13, grid: [[W,W,W,S,W,W,W,W,W],[E,E,E,P,E,E,E,E,E],[E,E,E,P,P,P,P,E,E],[E,E,E,E,E,E,P,E,E],[W,W,E,E,E,E,P,E,W],[W,W,E,P,P,P,P,E,W],[W,W,E,P,E,E,E,E,W],[E,E,E,P,P,P,P,E,E],[E,E,E,E,E,E,P,E,E],[E,E,E,E,E,E,P,E,E],[E,E,E,E,E,E,P,E,E],[W,W,W,W,W,W,B,W,W]], waypoints:[{col:3,row:0},{col:3,row:1},{col:3,row:2},{col:4,row:2},{col:5,row:2},{col:6,row:2},{col:6,row:3},{col:6,row:4},{col:6,row:5},{col:5,row:5},{col:4,row:5},{col:3,row:5},{col:3,row:6},{col:3,row:7},{col:4,row:7},{col:5,row:7},{col:6,row:7},{col:6,row:8},{col:6,row:9},{col:6,row:10},{col:6,row:11}], spawnPos:{col:3,row:0}, basePos:{col:6,row:11} },
  // Tundra t3_m3
  { id:"t3_m3", totalWaves:14, grid: [[W,W,W,W,W,W,S,W,W],[W,E,E,E,E,E,P,E,E],[W,P,P,P,P,P,P,E,E],[W,P,E,E,E,E,E,E,E],[W,P,P,P,P,P,P,E,E],[W,E,E,E,E,E,P,E,E],[W,E,E,E,E,E,P,E,E],[W,P,P,P,P,P,P,E,E],[W,P,E,E,E,E,E,E,E],[W,P,E,E,E,E,E,E,E],[W,P,E,E,E,E,E,E,E],[W,B,W,W,W,W,W,W,W]], waypoints:[{col:6,row:0},{col:6,row:1},{col:6,row:2},{col:5,row:2},{col:4,row:2},{col:3,row:2},{col:2,row:2},{col:1,row:2},{col:1,row:3},{col:1,row:4},{col:2,row:4},{col:3,row:4},{col:4,row:4},{col:5,row:4},{col:6,row:4},{col:6,row:5},{col:6,row:6},{col:6,row:7},{col:5,row:7},{col:4,row:7},{col:3,row:7},{col:2,row:7},{col:1,row:7},{col:1,row:8},{col:1,row:9},{col:1,row:10},{col:1,row:11}], spawnPos:{col:6,row:0}, basePos:{col:1,row:11} },
  // Tundra t3_m4
  { id:"t3_m4", totalWaves:15, grid: [[W,S,W,W,W,W,W,W,W],[E,P,E,E,E,E,E,E,E],[E,P,P,P,P,P,P,P,E],[E,E,E,E,E,E,E,P,E],[E,P,P,P,P,P,P,P,E],[E,P,E,E,E,E,E,E,E],[E,P,P,P,P,P,P,P,E],[E,E,E,E,E,E,E,P,E],[E,P,P,P,P,P,P,P,E],[E,P,E,E,E,E,E,E,E],[E,P,E,E,E,E,E,E,E],[W,B,W,W,W,W,W,W,W]], waypoints:[{col:1,row:0},{col:1,row:1},{col:1,row:2},{col:2,row:2},{col:3,row:2},{col:4,row:2},{col:5,row:2},{col:6,row:2},{col:7,row:2},{col:7,row:3},{col:7,row:4},{col:6,row:4},{col:5,row:4},{col:4,row:4},{col:3,row:4},{col:2,row:4},{col:1,row:4},{col:1,row:5},{col:1,row:6},{col:2,row:6},{col:3,row:6},{col:4,row:6},{col:5,row:6},{col:6,row:6},{col:7,row:6},{col:7,row:7},{col:7,row:8},{col:6,row:8},{col:5,row:8},{col:4,row:8},{col:3,row:8},{col:2,row:8},{col:1,row:8},{col:1,row:9},{col:1,row:10},{col:1,row:11}], spawnPos:{col:1,row:0}, basePos:{col:1,row:11} },
  // Tundra t3_m5
  { id:"t3_m5", totalWaves:16, grid: [[W,W,W,W,W,W,W,S,W],[E,E,E,E,E,E,E,P,E],[E,E,E,E,P,P,P,P,E],[E,E,E,E,P,E,E,E,E],[E,W,W,W,P,E,E,E,E],[E,W,P,P,P,E,E,E,E],[E,W,P,E,E,E,E,E,E],[E,W,P,P,P,P,P,E,E],[E,W,E,E,E,E,P,E,E],[E,E,E,E,E,E,P,E,E],[E,E,E,E,E,E,P,E,E],[W,W,W,W,W,W,B,W,W]], waypoints:[{col:7,row:0},{col:7,row:1},{col:7,row:2},{col:6,row:2},{col:5,row:2},{col:4,row:2},{col:4,row:3},{col:4,row:4},{col:4,row:5},{col:3,row:5},{col:2,row:5},{col:2,row:6},{col:2,row:7},{col:3,row:7},{col:4,row:7},{col:5,row:7},{col:6,row:7},{col:6,row:8},{col:6,row:9},{col:6,row:10},{col:6,row:11}], spawnPos:{col:7,row:0}, basePos:{col:6,row:11} },
  // Tundra t3_m6
  { id:"t3_m6", totalWaves:18, grid: [[W,W,W,W,S,W,W,W,W],[E,E,E,E,P,E,E,E,E],[E,P,P,P,P,P,P,P,E],[E,P,E,E,E,E,E,E,E],[E,P,P,P,P,P,P,P,E],[E,E,E,E,E,E,E,P,E],[E,P,P,P,P,P,P,P,E],[E,P,E,E,E,E,E,E,E],[E,P,P,P,P,P,P,P,E],[E,E,E,E,E,E,E,P,E],[E,E,E,E,E,E,E,P,E],[W,W,W,W,W,W,W,B,W]], waypoints:[{col:4,row:0},{col:4,row:1},{col:4,row:2},{col:3,row:2},{col:2,row:2},{col:1,row:2},{col:1,row:3},{col:1,row:4},{col:2,row:4},{col:3,row:4},{col:4,row:4},{col:5,row:4},{col:6,row:4},{col:7,row:4},{col:7,row:5},{col:7,row:6},{col:6,row:6},{col:5,row:6},{col:4,row:6},{col:3,row:6},{col:2,row:6},{col:1,row:6},{col:1,row:7},{col:1,row:8},{col:2,row:8},{col:3,row:8},{col:4,row:8},{col:5,row:8},{col:6,row:8},{col:7,row:8},{col:7,row:9},{col:7,row:10},{col:7,row:11}], spawnPos:{col:4,row:0}, basePos:{col:7,row:11} },
  // Volcano v4_m2
  { id:"v4_m2", totalWaves:16, grid: [[W,W,S,W,W,W,W,W,W],[E,E,P,P,P,P,P,P,E],[E,E,E,E,E,E,E,P,E],[E,E,E,E,E,E,E,P,E],[E,W,W,P,P,P,P,P,E],[E,W,W,P,E,E,E,E,E],[E,W,W,P,E,E,E,E,E],[E,W,W,P,P,P,P,P,E],[E,E,E,E,E,E,E,P,E],[E,E,E,E,E,E,E,P,E],[E,E,E,E,E,E,E,P,E],[W,W,W,W,W,W,W,B,W]], waypoints:[{col:2,row:0},{col:2,row:1},{col:3,row:1},{col:4,row:1},{col:5,row:1},{col:6,row:1},{col:7,row:1},{col:7,row:2},{col:7,row:3},{col:7,row:4},{col:6,row:4},{col:5,row:4},{col:4,row:4},{col:3,row:4},{col:3,row:5},{col:3,row:6},{col:3,row:7},{col:4,row:7},{col:5,row:7},{col:6,row:7},{col:7,row:7},{col:7,row:8},{col:7,row:9},{col:7,row:10},{col:7,row:11}], spawnPos:{col:2,row:0}, basePos:{col:7,row:11} },
  // Volcano v4_m3
  { id:"v4_m3", totalWaves:17, grid: [[W,W,W,W,W,W,W,S,W],[E,E,E,E,E,E,E,P,E],[E,E,E,E,E,E,E,P,E],[E,P,P,P,P,P,P,P,E],[E,P,E,W,W,W,E,E,E],[E,P,E,W,W,W,E,E,E],[E,P,E,W,W,W,E,E,E],[E,P,P,P,P,P,P,P,E],[E,E,E,E,E,E,E,P,E],[E,E,E,E,E,E,E,P,E],[E,E,E,E,E,E,E,P,E],[W,W,W,W,W,W,W,B,W]], waypoints:[{col:7,row:0},{col:7,row:1},{col:7,row:2},{col:7,row:3},{col:6,row:3},{col:5,row:3},{col:4,row:3},{col:3,row:3},{col:2,row:3},{col:1,row:3},{col:1,row:4},{col:1,row:5},{col:1,row:6},{col:1,row:7},{col:2,row:7},{col:3,row:7},{col:4,row:7},{col:5,row:7},{col:6,row:7},{col:7,row:7},{col:7,row:8},{col:7,row:9},{col:7,row:10},{col:7,row:11}], spawnPos:{col:7,row:0}, basePos:{col:7,row:11} },
  // Volcano v4_m4
  { id:"v4_m4", totalWaves:18, grid: [[W,S,W,W,W,W,W,W,W],[E,P,E,E,E,E,E,E,E],[E,P,P,P,P,P,P,P,E],[E,E,E,E,E,E,E,P,E],[W,E,E,E,E,E,E,P,W],[W,P,P,P,P,P,P,P,W],[W,P,E,E,E,E,E,E,W],[W,P,P,P,P,P,P,P,W],[W,E,E,E,E,E,E,P,W],[E,E,E,E,E,E,E,P,E],[E,E,E,E,E,E,E,P,E],[W,W,W,W,W,W,W,B,W]], waypoints:[{col:1,row:0},{col:1,row:1},{col:1,row:2},{col:2,row:2},{col:3,row:2},{col:4,row:2},{col:5,row:2},{col:6,row:2},{col:7,row:2},{col:7,row:3},{col:7,row:4},{col:7,row:5},{col:6,row:5},{col:5,row:5},{col:4,row:5},{col:3,row:5},{col:2,row:5},{col:1,row:5},{col:1,row:6},{col:1,row:7},{col:2,row:7},{col:3,row:7},{col:4,row:7},{col:5,row:7},{col:6,row:7},{col:7,row:7},{col:7,row:8},{col:7,row:9},{col:7,row:10},{col:7,row:11}], spawnPos:{col:1,row:0}, basePos:{col:7,row:11} },
  // Volcano v4_m5
  { id:"v4_m5", totalWaves:19, grid: [[W,W,W,W,S,W,W,W,W],[W,E,E,E,P,E,E,E,W],[W,E,P,P,P,E,E,E,W],[W,E,P,E,E,E,E,E,W],[W,E,P,P,P,P,P,E,W],[W,E,E,E,E,E,P,E,W],[W,E,E,E,E,E,P,E,W],[W,E,P,P,P,P,P,E,W],[W,E,P,E,E,E,E,E,W],[W,E,P,P,P,E,E,E,W],[W,E,E,E,P,E,E,E,W],[W,W,W,W,B,W,W,W,W]], waypoints:[{col:4,row:0},{col:4,row:1},{col:4,row:2},{col:3,row:2},{col:2,row:2},{col:2,row:3},{col:2,row:4},{col:3,row:4},{col:4,row:4},{col:5,row:4},{col:6,row:4},{col:6,row:5},{col:6,row:6},{col:6,row:7},{col:5,row:7},{col:4,row:7},{col:3,row:7},{col:2,row:7},{col:2,row:8},{col:2,row:9},{col:3,row:9},{col:4,row:9},{col:4,row:10},{col:4,row:11}], spawnPos:{col:4,row:0}, basePos:{col:4,row:11} },
  // Volcano v4_m6
  { id:"v4_m6", totalWaves:20, grid: [[W,W,W,W,S,W,W,W,W],[E,E,E,E,P,E,E,E,E],[E,P,P,P,P,E,E,E,E],[E,P,E,E,E,E,E,E,E],[E,P,P,P,P,P,E,E,E],[E,E,E,E,E,P,E,E,E],[E,E,E,E,E,P,E,E,E],[E,E,E,P,P,P,E,E,E],[E,E,E,P,E,E,E,E,E],[E,E,P,P,E,E,E,E,E],[E,E,P,E,E,E,E,E,E],[W,W,B,W,W,W,W,W,W]], waypoints:[{col:4,row:0},{col:4,row:1},{col:4,row:2},{col:3,row:2},{col:2,row:2},{col:1,row:2},{col:1,row:3},{col:1,row:4},{col:2,row:4},{col:3,row:4},{col:4,row:4},{col:5,row:4},{col:5,row:5},{col:5,row:6},{col:5,row:7},{col:4,row:7},{col:3,row:7},{col:3,row:8},{col:3,row:9},{col:2,row:9},{col:2,row:10},{col:2,row:11}], spawnPos:{col:4,row:0}, basePos:{col:2,row:11} },
  // Shadow s5_m2
  { id:"s5_m2", totalWaves:19, grid: [[W,W,S,W,W,W,W,W,W],[E,E,P,P,P,P,P,P,E],[E,E,E,E,E,E,E,P,E],[E,E,E,E,E,E,E,P,E],[E,P,P,P,P,P,P,P,E],[E,P,E,E,E,E,E,E,E],[E,P,E,E,E,E,E,E,E],[E,P,P,P,P,P,P,P,E],[E,E,E,E,E,E,E,P,E],[E,E,E,E,E,E,E,P,E],[E,E,E,E,E,E,E,P,E],[W,W,W,W,W,W,W,B,W]], waypoints:[{col:2,row:0},{col:2,row:1},{col:3,row:1},{col:4,row:1},{col:5,row:1},{col:6,row:1},{col:7,row:1},{col:7,row:2},{col:7,row:3},{col:7,row:4},{col:6,row:4},{col:5,row:4},{col:4,row:4},{col:3,row:4},{col:2,row:4},{col:1,row:4},{col:1,row:5},{col:1,row:6},{col:1,row:7},{col:2,row:7},{col:3,row:7},{col:4,row:7},{col:5,row:7},{col:6,row:7},{col:7,row:7},{col:7,row:8},{col:7,row:9},{col:7,row:10},{col:7,row:11}], spawnPos:{col:2,row:0}, basePos:{col:7,row:11} },
  // Shadow s5_m3
  { id:"s5_m3", totalWaves:20, grid: [[W,W,W,W,W,W,W,S,W],[E,E,E,E,E,E,E,P,E],[E,P,P,P,P,P,P,P,E],[E,P,E,E,E,E,E,E,E],[E,P,P,P,P,P,E,E,E],[E,E,E,E,E,P,E,E,E],[E,E,E,E,E,P,E,E,E],[E,P,P,P,P,P,E,E,E],[E,P,E,E,E,E,E,E,E],[E,P,P,P,P,P,P,E,E],[E,E,E,E,E,E,P,E,E],[W,W,W,W,W,W,B,W,W]], waypoints:[{col:7,row:0},{col:7,row:1},{col:7,row:2},{col:6,row:2},{col:5,row:2},{col:4,row:2},{col:3,row:2},{col:2,row:2},{col:1,row:2},{col:1,row:3},{col:1,row:4},{col:2,row:4},{col:3,row:4},{col:4,row:4},{col:5,row:4},{col:5,row:5},{col:5,row:6},{col:5,row:7},{col:4,row:7},{col:3,row:7},{col:2,row:7},{col:1,row:7},{col:1,row:8},{col:1,row:9},{col:2,row:9},{col:3,row:9},{col:4,row:9},{col:5,row:9},{col:6,row:9},{col:6,row:10},{col:6,row:11}], spawnPos:{col:7,row:0}, basePos:{col:6,row:11} },
  // Shadow s5_m4
  { id:"s5_m4", totalWaves:22, grid: [[W,W,W,W,S,W,W,W,W],[E,E,E,E,P,E,E,E,E],[E,P,P,P,P,P,P,P,E],[E,P,E,E,E,E,E,E,E],[E,P,P,P,P,P,P,P,E],[E,E,E,E,E,E,E,P,E],[E,P,P,P,P,P,P,P,E],[E,P,E,E,E,E,E,E,E],[E,P,P,P,P,P,P,P,E],[E,E,E,E,E,E,E,P,E],[E,E,E,E,E,E,E,P,E],[W,W,W,W,W,W,W,B,W]], waypoints:[{col:4,row:0},{col:4,row:1},{col:4,row:2},{col:3,row:2},{col:2,row:2},{col:1,row:2},{col:1,row:3},{col:1,row:4},{col:2,row:4},{col:3,row:4},{col:4,row:4},{col:5,row:4},{col:6,row:4},{col:7,row:4},{col:7,row:5},{col:7,row:6},{col:6,row:6},{col:5,row:6},{col:4,row:6},{col:3,row:6},{col:2,row:6},{col:1,row:6},{col:1,row:7},{col:1,row:8},{col:2,row:8},{col:3,row:8},{col:4,row:8},{col:5,row:8},{col:6,row:8},{col:7,row:8},{col:7,row:9},{col:7,row:10},{col:7,row:11}], spawnPos:{col:4,row:0}, basePos:{col:7,row:11} },
  // Shadow s5_m5
  { id:"s5_m5", totalWaves:23, grid: [[S,W,W,W,W,W,W,W,W],[P,P,P,P,P,P,P,P,E],[E,E,E,E,E,E,E,P,E],[E,E,E,E,E,E,E,P,E],[E,P,P,P,P,P,P,P,E],[E,P,E,E,E,E,E,E,E],[E,P,E,E,E,E,E,E,E],[E,P,P,P,P,P,E,E,E],[E,E,E,E,E,P,E,E,E],[E,E,E,E,E,P,E,E,E],[E,E,E,E,E,P,E,E,E],[W,W,W,W,W,B,W,W,W]], waypoints:[{col:0,row:0},{col:0,row:1},{col:1,row:1},{col:2,row:1},{col:3,row:1},{col:4,row:1},{col:5,row:1},{col:6,row:1},{col:7,row:1},{col:7,row:2},{col:7,row:3},{col:7,row:4},{col:6,row:4},{col:5,row:4},{col:4,row:4},{col:3,row:4},{col:2,row:4},{col:1,row:4},{col:1,row:5},{col:1,row:6},{col:1,row:7},{col:2,row:7},{col:3,row:7},{col:4,row:7},{col:5,row:7},{col:5,row:8},{col:5,row:9},{col:5,row:10},{col:5,row:11}], spawnPos:{col:0,row:0}, basePos:{col:5,row:11} },
  // Shadow s5_m6
  { id:"s5_m6", totalWaves:25, grid: [[W,S,W,W,W,W,W,W,W],[E,P,E,E,E,E,E,E,E],[E,P,P,P,P,P,P,P,E],[E,E,E,E,E,E,E,P,E],[E,P,P,P,P,P,P,P,E],[E,P,E,E,E,E,E,E,E],[E,P,P,P,P,P,P,P,E],[E,E,E,E,E,E,E,P,E],[E,P,P,P,P,P,P,P,E],[E,P,E,E,E,E,E,E,E],[E,P,E,E,E,E,E,E,E],[W,B,W,W,W,W,W,W,W]], waypoints:[{col:1,row:0},{col:1,row:1},{col:1,row:2},{col:2,row:2},{col:3,row:2},{col:4,row:2},{col:5,row:2},{col:6,row:2},{col:7,row:2},{col:7,row:3},{col:7,row:4},{col:6,row:4},{col:5,row:4},{col:4,row:4},{col:3,row:4},{col:2,row:4},{col:1,row:4},{col:1,row:5},{col:1,row:6},{col:2,row:6},{col:3,row:6},{col:4,row:6},{col:5,row:6},{col:6,row:6},{col:7,row:6},{col:7,row:7},{col:7,row:8},{col:6,row:8},{col:5,row:8},{col:4,row:8},{col:3,row:8},{col:2,row:8},{col:1,row:8},{col:1,row:9},{col:1,row:10},{col:1,row:11}], spawnPos:{col:1,row:0}, basePos:{col:1,row:11} },
];

let allPass = true;
maps.forEach(m => {
  const result = validateMapData(m);
  if (!result.valid) {
    console.log("FAIL " + m.id + ": " + result.errors.join("; "));
    allPass = false;
  } else {
    console.log("PASS " + m.id);
  }
});
console.log(allPass ? "\nALL 19 MAPS PASS" : "\nSOME MAPS FAILED");
