use std::str::FromStr;

use ark_bn254::{Bn254, Fq, Fq2, Fr, G1Affine, G2Affine};
use ark_ff::Fp;
use ark_groth16::{prepare_verifying_key, Groth16, Proof, VerifyingKey};

type G1Json = [String; 3];
type G2Json = [[String; 2]; 3];

fn parse_fq(json: &str) -> Fq {
    Fq::from_str(json).expect("Badly formed number")
}

fn parse_g1_unchecked(json: &G1Json) -> G1Affine {
    G1Affine::new_unchecked(parse_fq(json[0].as_str()), parse_fq(json[1].as_str()))
}

fn parse_g2_unchecked(json: &G2Json) -> G2Affine {
    G2Affine::new_unchecked(
        Fq2::new(parse_fq(json[0][0].as_str()), parse_fq(json[0][1].as_str())),
        Fq2::new(parse_fq(json[1][0].as_str()), parse_fq(json[1][1].as_str())),
    )
}

#[derive(serde::Deserialize, Debug)]
struct VkJson {
    protocol: String,
    curve: String,
    #[serde(rename = "nPublic")]
    n_public: usize,
    vk_alpha_1: G1Json,
    vk_beta_2: G2Json,
    vk_gamma_2: G2Json,
    vk_delta_2: G2Json,
    // "vk_alphabeta_12" unused
    #[serde(rename = "IC")]
    ic: Vec<G1Json>,
}

fn parse_vk_json(vk_json_str: &str) -> VerifyingKey<Bn254> {
    let vk_json: VkJson = serde_json::from_str(vk_json_str).expect("Badly formed vk");
    assert_eq!(vk_json.protocol.as_str(), "groth16");
    assert_eq!(vk_json.curve.as_str(), "bn128");
    assert_eq!(vk_json.n_public, vk_json.vk_gamma_2.len() + 1);
    VerifyingKey {
        alpha_g1: parse_g1_unchecked(&vk_json.vk_alpha_1),
        beta_g2: parse_g2_unchecked(&vk_json.vk_beta_2),
        gamma_g2: parse_g2_unchecked(&vk_json.vk_gamma_2),
        delta_g2: parse_g2_unchecked(&vk_json.vk_delta_2),
        gamma_abc_g1: vk_json.ic.iter().map(parse_g1_unchecked).collect(),
    }
}

fn parse_proof(proof_str: &str) -> Proof<Bn254> {
    // For now handle as comma separated list
    let parts: Vec<Fq> = proof_str.split(',').into_iter().map(parse_fq).collect();
    assert_eq!(parts.len(), 8);
    Proof {
        a: G1Affine::new(parts[0], parts[1]),
        b: G2Affine::new(Fq2::new(parts[2], parts[3]), Fq2::new(parts[4], parts[5])),
        c: G1Affine::new(parts[6], parts[7]),
    }
}

fn parse_public_inputs(public_input_strs: &[&str]) -> Vec<Fr> {
    public_input_strs
        .iter()
        .map(|public_input_str| {
            Fp::from_str(public_input_str).expect("Badly formed number in public input")
        })
        .collect()
}

pub fn verify(vk_json_str: &str, proof_str: &str, public_input_strs: &[&str]) -> bool {
    let vk = parse_vk_json(vk_json_str);
    let pvk = prepare_verifying_key(&vk);
    let proof = parse_proof(proof_str);
    let public_inputs = parse_public_inputs(public_input_strs);
    Groth16::<Bn254>::verify_proof(&pvk, &proof, &public_inputs).unwrap()
}
