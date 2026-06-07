import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

const description = "회의록을 요약, 결정사항, 액션 아이템, 후속 메일과 일정으로 정리하는 AI 회의 후속 업무 워크스페이스입니다.";

export const metadata: Metadata = {
  title: {
    default: "MeetingFlow AI",
    template: "%s | MeetingFlow AI"
  },
  description,
  keywords: ["회의록 AI", "회의 요약", "액션 아이템", "후속 업무 자동화", "MeetingFlow AI"],
  openGraph: {
    title: "MeetingFlow AI",
    description,
    locale: "ko_KR",
    siteName: "MeetingFlow AI",
    type: "website"
  },
  twitter: {
    card: "summary",
    title: "MeetingFlow AI",
    description
  },
  icons: {
    icon: "/logo.png",
    apple: "/logo.png"
  }
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
