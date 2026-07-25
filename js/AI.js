/*! 一叶孤舟 | qq:28701884 | 欢迎指教 */
/* AI 强化版 - 包含迭代加深、置换表、着法排序、位置评估 */

var AI = AI||{};

// 置换表 - 记录已计算的局面
AI.transpositionTable = {};
AI.transpositionTableSize = 100000;

// 棋子位置价值表 - 让 AI 理解占位优势
AI.pieceSquareTables = {
'c': [
[10,10,20,30,30,30,20,10,10],[20,30,40,50,50,50,40,30,20],
[10,20,30,40,40,40,30,20,10],[10,20,30,40,40,40,30,20,10],
[10,20,30,40,40,40,30,20,10],[10,20,30,40,40,40,30,20,10],
[10,20,30,40,40,40,30,20,10],[10,20,30,40,40,40,30,20,10],
[10,20,30,40,40,40,30,20,10],[10,20,30,40,40,40,30,20,10]
],
'm': [
[10,20,30,25,20,25,30,20,10],[20,30,40,45,40,45,40,30,20],
[30,40,50,55,50,55,50,40,30],[30,40,55,60,55,60,55,40,30],
[30,40,50,55,50,55,50,40,30],[30,40,55,60,55,60,55,40,30],
[20,30,40,45,40,45,40,30,20],[10,20,30,25,20,25,30,20,10],
[5,10,15,20,15,20,15,10,5],[5,10,15,20,15,20,15,10,5]
],
'x': [
[5,0,10,0,5,0,10,0,5],[0,0,0,0,0,0,0,0,0],
[10,0,20,0,10,0,20,0,10],[0,0,0,0,0,0,0,0,0],
[5,0,10,0,5,0,10,0,5],[5,0,10,0,5,0,10,0,5],
[0,0,0,0,0,0,0,0,0],[10,0,20,0,10,0,20,0,10],
[0,0,0,0,0,0,0,0,0],[5,0,10,0,5,0,10,0,5]
],
's': [
[0,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0,0],
[0,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0,0],
[0,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0,0],
[0,0,0,0,0,0,0,0,0],[0,0,0,10,0,10,0,0,0],
[0,0,0,0,20,0,0,0,0],[0,0,0,10,0,10,0,0,0]
],
'j': [
[0,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0,0],
[0,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0,0],
[0,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0,0],
[0,0,0,0,0,0,0,0,0],[0,0,0,10,0,10,0,0,0],
[0,0,0,0,20,0,0,0,0],[0,0,0,10,0,10,0,0,0]
],
'p': [
[20,20,20,30,30,30,20,20,20],[20,20,20,30,30,30,20,20,20],
[20,20,20,30,30,30,20,20,20],[20,20,20,30,30,30,20,20,20],
[10,10,10,20,20,20,10,10,10],[10,10,10,20,20,20,10,10,10],
[20,20,20,30,30,30,20,20,20],[20,20,20,30,30,30,20,20,20],
[20,20,20,30,30,30,20,20,20],[20,20,20,30,30,30,20,20,20]
],
'z': [
[10,10,20,30,40,30,20,10,10],[10,10,20,30,40,30,20,10,10],
[10,10,20,30,40,30,20,10,10],[10,10,20,30,40,30,20,10,10],
[10,10,20,30,40,30,20,10,10],[0,0,0,0,0,0,0,0,0],
[0,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0,0],
[0,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0,0]
]
};

// 局面哈希函数
AI.getZobristKey = function(map) {
var key = "";
for (var i = 0; i < map.length; i++) {
key += map[i].join(",") + ";";
}
return key;
}

//人工智能初始化
AI.init = function(pace){
var bill = AI.historyBill || com.gambit;
if (bill.length){
var len=pace.length;
var arr=[];
for (var i=0;i< bill.length;i++){
if (bill[i].slice(0,len)==pace) {
arr.push(bill[i]);
}
}
if (arr.length){
var inx=Math.floor( Math.random() * arr.length );
AI.historyBill = arr ;
return arr[inx].slice(len,len+4).split("");
}else{
AI.historyBill = [] ;
}
}

var initTime = new Date().getTime();
AI.treeDepth=play.depth;
AI.number=0;
AI.transpositionTable = {};

// 使用迭代加深搜索，时间限制 3 秒
var val = AI.iterativeSearchWithTimeLimit(com.arr2Clone(play.map), play.my, 3000);

if (!val||val.value==-8888) {
AI.treeDepth=2;
val=AI.getAlphaBeta(-99999 ,99999, AI.treeDepth, com.arr2Clone(play.map),play.my);
}
if (val&&val.value!=-8888) {
var man = play.mans[val.key];
var nowTime= new Date().getTime();
console.log('最佳着法：'+com.createMove(com.arr2Clone(play.map),man.x,man.y,val.x,val.y)+
' 搜索深度：'+AI.treeDepth+' 搜索分支：'+AI.number+'个  最佳着法评估：'+
val.value+'分 搜索用时：'+(nowTime-initTime)+'毫秒');
return [man.x,man.y,val.x,val.y];
}else {
return false;
}
}

// 带时间限制的迭代加深搜索
AI.iterativeSearchWithTimeLimit = function(map, my, timeLimitMs) {
var initDepth = 1;
var maxDepth = 8;
AI.treeDepth = 0;
var initTime = new Date().getTime();
var bestVal = null;

for (var i = initDepth; i <= maxDepth; i++) {
var nowTime = new Date().getTime();
if (nowTime - initTime > timeLimitMs * 0.7 && i > 3) {
console.log('时间限制到达，返回深度 '+AI.treeDepth+' 的结果');
return bestVal;
}

AI.treeDepth = i;
var val = AI.getAlphaBeta(-99999, 99999, AI.treeDepth, map, my);

if (val && val.value != -8888) {
bestVal = val;
console.log('迭代加深完成，深度='+i+', 评估='+val.value);
}

if (val && Math.abs(val.value) >= 8000) {
console.log('找到决定性着法，提前终止搜索');
return val;
}
}
return bestVal;
}

AI.getMapAllMan = function (map, my){
var mans=[];
for (var i=0; i<map.length; i++){
for (var n=0; n<map[i].length; n++){
var key = map[i][n];
if (key && play.mans[key].my == my){
play.mans[key].x = n;
play.mans[key].y = i;
mans.push(play.mans[key]);
}
}
}
return mans;
}

AI.getMoves = function (map, my){
var manArr = AI.getMapAllMan (map, my);
var moves = [];
var foul=play.isFoul;
for (var i=0; i<manArr.length; i++){
var man = manArr[i];
var val=man.bl(map);
for (var n=0; n<val.length; n++){
var x=man.x, y=man.y, newX=val[n][0], newY=val[n][1];
if (!foul || foul[0]!=x || foul[1]!=y || foul[2]!=newX || foul[3]!=newY) {
moves.push([x,y,newX,newY,man.key]);
}
}
}
return moves;
}

// 着法排序：优先搜索吃子等着法
AI.sortMoves = function(moves, map) {
for (var i = 0; i < moves.length; i++) {
var newX = moves[i][2], newY = moves[i][3];
var targetKey = map[newY][newX];
if (targetKey) {
var targetValue = play.mans[targetKey].value[0][0] || 10;
moves[i].priority = targetValue * 10;
} else {
moves[i].priority = 0;
}
}
moves.sort(function(a, b) { return b.priority - a.priority; });
return moves;
}

AI.getAlphaBeta = function (A, B, depth, map ,my) {
var txtMap = AI.getZobristKey(map);
var history = AI.transpositionTable[txtMap];

if (history && history.depth >= depth) {
if (history.flag == 'exact') return {"value": history.value};
if (history.flag == 'lowerbound' && history.value > A) A = history.value;
if (history.flag == 'upperbound' && history.value < B) B = history.value;
if (A >= B) return {"value": history.value};
}

if (depth == 0) return {"value": AI.evaluate(map, my)};

var moves = AI.getMoves(map, my);
moves = AI.sortMoves(moves, map);

var bestMove = null;
for (var i=0; i < moves.length; i++) {
var move = moves[i];
var key = move[4], oldX = move[0], oldY = move[1];
var newX = move[2], newY = move[3];
var clearKey = map[newY][newX] || "";

map[newY][newX] = key;
delete map[oldY][oldX];
play.mans[key].x = newX;
play.mans[key].y = newY;

if (clearKey=="j0"||clearKey=="J0") {
play.mans[key].x = oldX;
play.mans[key].y = oldY;
map[oldY][oldX] = key;
delete map[newY][newX];
if (clearKey) map[newY][newX] = clearKey;

if (AI.treeDepth == depth) bestMove = {"key":key,"x":newX,"y":newY,"value":8888};
return {"key":key,"x":newX,"y":newY,"value":8888};
} else {
var val = -AI.getAlphaBeta(-B, -A, depth - 1, map, -my).value;

play.mans[key].x = oldX;
play.mans[key].y = oldY;
map[oldY][oldX] = key;
delete map[newY][newX];
if (clearKey) map[newY][newX] = clearKey;

if (val >= B) {
AI.transpositionTable[txtMap] = {depth: depth, value: B, flag: 'lowerbound', move: move};
return {"key":key,"x":newX,"y":newY,"value":B};
}
if (val > A) {
A = val;
bestMove = {"key":key,"x":newX,"y":newY,"value":A};
}
}
}

var flag = bestMove ? 'exact' : 'upperbound';
AI.transpositionTable[txtMap] = {depth: depth, value: A, flag: flag, move: bestMove};

if (AI.treeDepth == depth) {
if (!bestMove) return false;
return bestMove;
}
return {"value":A};
}

// 评估棋局：棋子价值 + 位置价值
AI.evaluate = function (map, my) {
var val = 0;
for (var i=0; i<map.length; i++) {
for (var n=0; n<map[i].length; n++) {
var key = map[i][n];
if (key) {
var man = play.mans[key];
var pieceType = key.charAt(0).toLowerCase();
var baseValue = man.value[i][n];

// 添加位置价值
var positionValue = 0;
if (AI.pieceSquareTables[pieceType]) {
if (man.my === 1) {
// 红方
positionValue = AI.pieceSquareTables[pieceType][i][n] || 0;
} else {
// 黑方 - 对称位置
positionValue = AI.pieceSquareTables[pieceType][9-i][n] || 0;
}
}

val += (baseValue + positionValue) * man.my;
}
}
}
AI.number++;
return val * my;
}
