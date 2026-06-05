import Image from "next/image";

type AppLogoProps = {
  className?: string;
};

export function AppLogo({ className = "h-10 w-10" }: AppLogoProps) {
  return <Image className={`shrink-0 object-contain ${className}`} src="/logo.png" alt="" width={80} height={80} aria-hidden="true" />;
}
