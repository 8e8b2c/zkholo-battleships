
#!/bin/sh
set -e

mkdir -p build

CIRCUITS="create move"

for circuit in $CIRCUITS; do
  echo "Building $circuit"
  rm -rf build/$circuit
  mkdir build/$circuit

  ~/.cargo/bin/circom $circuit.circom --r1cs --wasm -o build/$circuit
  cd build/$circuit
  npx snarkjs powersoftau new bn128 12 pot12_0000.ptau
  npx snarkjs powersoftau contribute pot12_0000.ptau pot12_0001.ptau --name="First contribution" -e="$(openssl rand -base64 20)"
  npx snarkjs powersoftau prepare phase2 pot12_0001.ptau pot12_final.ptau
  npx snarkjs groth16 setup ${circuit}.r1cs pot12_final.ptau ${circuit}_0000.zkey
  # NB: This trusted setup isn't suitable for production usage
  npx snarkjs zkey contribute ${circuit}_0000.zkey ${circuit}_0001.zkey --name="Second contribution" -e="$(openssl rand -base64 20)"
  npx snarkjs zkey export verificationkey ${circuit}_0001.zkey verification_key.json
  cd ../..
done
