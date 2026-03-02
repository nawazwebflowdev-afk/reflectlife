/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1';
import { Html, Head, Body, Container, Section, Text, Button, Hr } from 'npm:@react-email/components@0.0.22';

interface EmailChangeProps {
  siteName?: string;
  siteUrl?: string;
  confirmationUrl?: string;
  recipient?: string;
  newEmail?: string;
}

export default function EmailChangeEmail({
  siteName = 'ReflectLife',
  siteUrl = 'https://reflectlife.net',
  confirmationUrl = '',
  recipient = '',
  newEmail = '',
}: EmailChangeProps) {
  return (
    <Html>
      <Head />
      <Body style={main}>
        <Container style={container}>
          <Section style={logoSection}>
            <Text style={logoText}>🌸 ReflectLife</Text>
          </Section>
          <Section style={content}>
            <Text style={heading}>Confirm email change</Text>
            <Text style={paragraph}>
              We received a request to change your email address{newEmail ? ` to ${newEmail}` : ''}. Please confirm this change:
            </Text>
            <Section style={buttonContainer}>
              <Button style={button} href={confirmationUrl}>
                Confirm email change
              </Button>
            </Section>
            <Text style={smallText}>
              If you didn't request this change, please secure your account immediately.
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

const buttonContainer = {
  textAlign: 'center' as const,
  marginTop: '24px',
  marginBottom: '24px',
};

const button = {
  backgroundColor: 'hsl(315, 18%, 32%)',
  color: 'hsl(42, 35%, 96%)',
  borderRadius: '16px',
  fontSize: '16px',
  fontWeight: '600' as const,
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'inline-block',
  padding: '14px 32px',
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
