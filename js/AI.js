// WebAssembly AI Engine - Dogpawasm
var AI = AI || {};
AI.wasmInstance = null;
AI.wasmMemory = null;
AI.wasmExports = null;

// Initialize Wasm module
AI.initWasm = async function() {
    if (AI.wasmInstance) return true;
    
    try {
        const response = await fetch('wasm/main.wasm');
        const wasmBytes = await response.arrayBuffer();
        const { instance } = await WebAssembly.instantiate(wasmBytes);
        AI.wasmInstance = instance;
        AI.wasmExports = instance.exports;
        AI.wasmMemory = instance.exports.memory;
        console.log('Wasm AI engine loaded successfully');
        return true;
    } catch (e) {
        console.error('Failed to load Wasm:', e);
        return false;
    }
};

// Convert board to FEN-like format for Wasm
AI.mapToFen = function(map) {
    let fen = '';
    for (let i = 0; i < 10; i++) {
        let empty = 0;
        for (let j = 0; j < 9; j++) {
            const key = map[i][j];
            if (!key || key === '0') {
                empty++;
            } else {
                if (empty > 0) {
                    fen += empty;
                    empty = 0;
                }
                // Map piece keys to FEN notation
                const pieceMap = {
                    'c': 'C', 'm': 'H', 'x': 'E', 's': 'A', 'j': 'G', 'p': 'C', 'z': 'S',
                    'C': 'c', 'M': 'h', 'X': 'e', 'S': 'a', 'J': 'g', 'P': 'c', 'Z': 's'
                };
                fen += pieceMap[key.charAt(0)] || '?';
            }
        }
        if (empty > 0) fen += empty;
        if (i < 9) fen += '/';
    }
    return fen;
};

// Get best move from Wasm engine
AI.getBestMove = function(fen, side) {
    if (!AI.wasmExports || !AI.wasmExports.get_best_move) {
        return null;
    }
    
    try {
        // Allocate memory for FEN string
        const encoder = new TextEncoder();
        const fenBytes = encoder.encode(fen);
        const ptr = AI.wasmExports.malloc(fenBytes.length + 1);
        
        // Write FEN to wasm memory
        const memory = new Uint8Array(AI.wasmMemory.buffer);
        memory.set(fenBytes, ptr);
        memory[ptr + fenBytes.length] = 0; // null terminator
        
        // Call wasm function (side: 1=red, -1=black)
        const resultPtr = AI.wasmExports.get_best_move(ptr, side === 1 ? 0 : 1);
        
        // Read result string
        let result = '';
        let i = 0;
        while (memory[resultPtr + i] !== 0) {
            result += String.fromCharCode(memory[resultPtr + i]);
            i++;
        }
        
        // Free allocated memory
        AI.wasmExports.free(ptr);
        AI.wasmExports.free(resultPtr);
        
        // Parse result (format: "from_to" e.g., "45_44")
        const parts = result.split('_');
        if (parts.length === 2) {
            const from = parseInt(parts[0], 10);
            const to = parseInt(parts[1], 10);
            // Convert linear index to x,y coordinates
            const fromX = from % 9;
            const fromY = Math.floor(from / 9);
            const toX = to % 9;
            const toY = Math.floor(to / 9);
            return [fromX, fromY, toX, toY];
        }
        
        return null;
    } catch (e) {
        console.error('Wasm getBestMove error:', e);
        return null;
    }
};

// Main AI entry point
AI.init = async function(pace) {
    // Initialize Wasm if not already done
    await AI.initWasm();
    
    // Try to use opening book first
    var bill = AI.historyBill || com.gambit;
    if (bill && bill.length) {
        var len = pace.length;
        var arr = [];
        for (var i = 0; i < bill.length; i++) {
            if (bill[i].slice(0, len) == pace) {
                arr.push(bill[i]);
            }
        }
        if (arr.length) {
            var inx = Math.floor(Math.random() * arr.length);
            AI.historyBill = arr;
            return arr[inx].slice(len, len + 4).split("");
        } else {
            AI.historyBill = [];
        }
    }
    
    // Use Wasm engine for move calculation
    if (AI.wasmExports && AI.wasmExports.get_best_move) {
        const fen = AI.mapToFen(play.map);
        const move = AI.getBestMove(fen, play.my);
        
        if (move) {
            const man = play.mans[play.map[move[1]][move[0]]];
            if (man) {
                console.log('Wasm AI move: [' + move.join(',') + ']');
                return move;
            }
        }
    }
    
    // Fallback to simple random move if Wasm fails
    var moves = AI.getAllMoves(play.map, play.my);
    if (moves.length > 0) {
        var randomMove = moves[Math.floor(Math.random() * moves.length)];
        return randomMove;
    }
    
    return false;
};

// Get all possible moves for a side
AI.getAllMoves = function(map, my) {
    var moves = [];
    for (var i = 0; i < map.length; i++) {
        for (var n = 0; n < map[i].length; n++) {
            var key = map[i][n];
            if (key && play.mans[key] && play.mans[key].my === my) {
                play.mans[key].x = n;
                play.mans[key].y = i;
                var val = play.mans[key].bl(map);
                for (var j = 0; j < val.length; j++) {
                    moves.push([n, i, val[j][0], val[j][1]]);
                }
            }
        }
    }
    return moves;
};
