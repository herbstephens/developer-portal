/**
 * Contains all functions for interacting with Amazon KMS
 */

import {
  CreateKeyCommand,
  DescribeKeyCommand,
  GetPublicKeyCommand,
  KMSClient,
  ScheduleKeyDeletionCommand,
  SignCommand,
} from "@aws-sdk/client-kms";
import { AssumeRoleCommand, STSClient } from "@aws-sdk/client-sts";
import { base64url } from "jose";
import { retrieveJWK } from "./jwks";
import dayjs from "dayjs";
import { JWK_TIME_TO_LIVE } from "src/lib/constants";

const kmsKeyPolicy = (expire_at: dayjs.Dayjs) => `{
  "Version": "2012-10-17",
  "Id": "key-default-1",
  "Statement": [
    {
      "Sid": "AllowAccessUntilExpirationDate",
      "Effect": "Allow",
      "Principal": {
        "AWS": "${process.env.AWS_KMS_ROLE_ARN}"
      },
      "Action": [
        "kms:CreateKey",
        "kms:TagResource",
        "kms:DescribeKey",
        "kms:PutKeyPolicy",
        "kms:GetPublicKey",
        "kms:Sign",
        "kms:Verify",
        "kms:ScheduleKeyDeletion"
      ],
      "Resource": "*",
      "Condition": {
        "DateLessThan": {
          "aws:CurrentTime": "${expire_at.toISOString()}"
        }
      }
    }
  ]
}`;

export type CreateKeyResult =
  | {
      keyId: string;
      publicKey: string;
    }
  | undefined;

export const getKMSClient = async () => {
  const stsClient = new STSClient({ region: process.env.AWS_REGION_NAME });

  try {
    const response = await stsClient.send(
      new AssumeRoleCommand({
        RoleArn: process.env.AWS_KMS_ROLE_ARN,
        RoleSessionName: "DevPortalKmsSession",
        DurationSeconds: 3600, // 1 hour
      })
    );

    if (response.Credentials) {
      const roleCredentials = {
        accessKeyId: response.Credentials.AccessKeyId,
        secretAccessKey: response.Credentials.SecretAccessKey,
        sessionToken: response.Credentials.SessionToken,
      };

      const kmsClient = new KMSClient({
        region: process.env.AWS_REGION_NAME,
        // @ts-ignore
        credentials: roleCredentials,
      });

      return kmsClient;
    }
  } catch (error) {
    console.error("Error assuming role:", error);
  }
};

export const createKMSKey = async (
  client: KMSClient,
  alg: string
): Promise<CreateKeyResult> => {
  try {
    const { KeyMetadata } = await client.send(
      new CreateKeyCommand({
        KeySpec: alg,
        KeyUsage: "SIGN_VERIFY",
        Description: `Developer Portal JWK for Sign in with Worldcoin. Created: ${new Date().toISOString()}`,
        Policy: kmsKeyPolicy(dayjs().add(JWK_TIME_TO_LIVE, "day")),
        Tags: [{ TagKey: "app", TagValue: "developer-portal" }],
      })
    );

    const keyId = KeyMetadata?.KeyId;

    if (keyId) {
      const { PublicKey } = await client.send(
        new GetPublicKeyCommand({ KeyId: keyId })
      );

      if (PublicKey) {
        const publicKey = `-----BEGIN PUBLIC KEY-----
${Buffer.from(PublicKey).toString("base64")}
-----END PUBLIC KEY-----`;

        return { keyId, publicKey };
      }
    }
  } catch (error) {
    console.error("Error creating key:", error);
  }
};

export const getKMSKeyStatus = async (client: KMSClient, keyId: string) => {
  try {
    const { KeyMetadata } = await client.send(
      new DescribeKeyCommand({
        KeyId: keyId,
      })
    );
    return KeyMetadata?.Enabled;
  } catch (error) {
    console.error("Error describing key:", error);
  }
};

export const signJWTWithKMSKey = async (
  client: KMSClient,
  header: Record<string, any>,
  payload: Record<string, any>
) => {
  const encodedHeader = base64url.encode(JSON.stringify(header));
  const encodedPayload = base64url.encode(JSON.stringify(payload));
  const encodedHeaderPayload = `${encodedHeader}.${encodedPayload}`;

  try {
    const { kms_id } = await retrieveJWK(header.kid); // NOTE: JWK is already verified to be active at this point
    const response = await client.send(
      new SignCommand({
        KeyId: kms_id,
        Message: Buffer.from(encodedHeaderPayload),
        MessageType: "RAW",
        SigningAlgorithm: "RSASSA_PKCS1_V1_5_SHA_256",
      })
    );

    if (response?.Signature) {
      // See: https://www.rfc-editor.org/rfc/rfc7515#appendix-C
      const encodedSignature = base64url
        .encode(response.Signature)
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/=/g, "");
      return `${encodedHeaderPayload}.${encodedSignature}`;
    }
  } catch (error) {
    console.error("Error signing JWT:", error);
  }
};

export const scheduleKeyDeletion = async (client: KMSClient, keyId: string) => {
  try {
    await client.send(
      new ScheduleKeyDeletionCommand({
        KeyId: keyId,
        PendingWindowInDays: 7, // Note: 7 is the minimum allowed value
      })
    );
  } catch (error) {
    console.error("Error scheduling key deletion:", error);
  }
};