// https://github.com/kunalmodi/battlesnark/blob/master/circuits/consts.circom

pragma circom 2.0.0;

function getBoardSize() {
  return 10;
}

function getEmptyBoard() {
  return [
    [0,0,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0,0,0]
  ];
}

function getShipLengths() {
  return [
    5, // Carrier
    4, // Battleship
    3, // Cruiser
    3, // Submarine
    2  // Destroyer
  ];
}