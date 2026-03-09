/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1';
import { Html, Head, Body, Container, Section, Text, Hr } from 'npm:@react-email/components@0.0.22';

interface ReauthenticationEmailProps {
  siteName?: string;
  siteUrl?: string;
  token?: string;
  recipient?: string;
}

export default function ReauthenticationEmail({
  siteName = 'Reflectlife',
  siteUrl = 'https://reflectlife.net',
  token = '',
  recipient = '',
}: ReauthenticationEmailProps) {
  return (
    <Html>
      <Head />
      <Body style={main}>
        <Container style={container}>
          <Section style={logoSection}>
            <Text style={logoText}>🌸 ReflectLife</Text>
          </Section>
          <Section style={content}>
            <Text style={heading}>Verification code</Text>
            <Text style={paragraph}>
              Use the code below to verify your identity. This code will expire shortly.
            </Text>
            <Section style={codeContainer}>
              <Text style={codeText}>{token}</Text>
            </Section>
            <Text style={smallText}>
              If you didn't request this code, please secure your account immediately.
            </Text>
          </Section>
          <Hr style={hr} />
          <Text style={footer}>
            © {new Date().getFullYear()} ReflectLife — Honouring life, preserving memories.
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

const main = {
  backgroundColor: '#ffffff',
  fontFamily: 'Georgia, "Times New Roman", serif',
};

const container = {
  margin: '0 auto',
  padding: '40px 20px',
  maxWidth: '560px',
};

const logoSection = {
  textAlign: 'center' as const,
  marginBottom: '32px',
};

const logoText = {
  fontSize: '24px',
  fontWeight: '700' as const,
  color: 'hsl(315, 18%, 32%)',
  margin: '0',
};

const content = {
  backgroundColor: 'hsl(42, 40%, 98%)',
  borderRadius: '16px',
  padding: '40px 32px',
  border: '1px solid hsl(42, 20%, 88%)',
};

const heading = {
  fontSize: '24px',
  fontWeight: '700' as const,
  color: 'hsl(280, 20%, 25%)',
  marginBottom: '16px',
  textAlign: 'center' as const,
};

const paragraph = {
  fontSize: '16px',
  lineHeight: '26px',
  color: 'hsl(280, 12%, 50%)',
  marginBottom: '16px',
};

const codeContainer = {
  textAlign: 'center' as const,
  margin: '24px 0',
  padding: '16px',
  backgroundColor: 'hsl(42, 35%, 96%)',
  borderRadius: '12px',
  border: '2px dashed hsl(315, 18%, 32%)',
};

const codeText = {
  fontSize: '32px',
  fontWeight: '700' as const,
  color: 'hsl(315, 18%, 32%)',
  letterSpacing: '8px',
  margin: '0',
};

const smallText = {
  fontSize: '13px',
  color: 'hsl(280, 12%, 50%)',
  textAlign: 'center' as const,
  marginTop: '16px',
};

const hr = {
  borderColor: 'hsl(42, 20%, 88%)',
  margin: '32px 0 16px',
};

const footer = {
  fontSize: '12px',
  color: 'hsl(280, 12%, 50%)',
  textAlign: 'center' as const,
};
