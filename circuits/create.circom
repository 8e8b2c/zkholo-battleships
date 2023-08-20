// https://github.com/kunalmodi/battlesnark/blob/master/circuits/create.circom

pragma circom 2.0.0;

include "./node_modules/circomlib/circuits/poseidon.circom";
include "./consts.circom";

template BattleshipCreate() {
  signal input nonce;
  signal input ships[5][3]; // [x,y,direction:0=down,1=right]

  signal output out;

  var boardSize = getBoardSize();
  var lengths[5] = getShipLengths();

  for (var i = 0; i < 5; i++) {
    var len = lengths[i];
    // validate starting position
    // validate boats don't overflow off board
    // validate no overlap
    // Implementation snipped for brevity, you can view the raw code on github
  }

  component poseidon = Poseidon(6); // 6 input numbers
  poseidon.inputs[0] <== nonce;     // First one is our salt. The next 5 are our ship positions
  for (var i = 0; i < 5; i++) {
    // Poseidon takes in a series of numbers, so we want to serialize each ship position as a number.
    // We know a Battleship position is (0...9), so we can store our (x,y,p) array as a 3-digit number
    // ie, [3,2,1] would become "123"
    poseidon.inputs[i+1] <== ships[i][0] + (ships[i][1] * (10 ** 1)) + (ships[i][2] * (10 ** 2));
  }
  out <-- poseidon.out;
}

component main = BattleshipCreate();
