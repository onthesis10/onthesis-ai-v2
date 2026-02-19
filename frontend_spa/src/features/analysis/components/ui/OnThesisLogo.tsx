import React from 'react';
import { cn } from '@/lib/utils';

interface OnThesisLogoProps {
    className?: string;
    variant?: 'animated' | 'static' | 'icon-only' | 'animated-icon';
    showText?: boolean;
    onClick?: () => void;
}

export function OnThesisLogo({
    className,
    variant = 'animated',
    showText = true,
    onClick
}: OnThesisLogoProps) {
    // If explicitly 'icon-only' or 'animated-icon', force showText to false and use a tighter viewBox/width
    const isIconOnly = variant === 'icon-only' || variant === 'animated-icon';
    const effectiveShowText = isIconOnly ? false : showText;

    // Icon-only viewbox is narrower
    const viewBox = isIconOnly ? "0 0 110 140" : "0 0 560 140";
    const width = isIconOnly ? "44" : "220";

    return (
        <svg
            data-testid="onthesis-logo"
            width={width}
            height="64"
            viewBox={viewBox}
            xmlns="http://www.w3.org/2000/svg"
            className={cn("select-none", className)}
            onClick={onClick}
            style={{
                // sinkron sama CSS theme
                // @ts-ignore - CSS Custom Properties
                "--base1": "var(--ocean-1)",
                "--base2": "var(--ocean-2)",
                "--highlight": "var(--ocean-highlight)",
                "--text": "var(--ink)",
            } as React.CSSProperties}
        >
            <defs>
                <linearGradient
                    id="oceanSkeleton"
                    gradientUnits="userSpaceOnUse"
                    x1="-200"
                    y1="0"
                    x2="400"
                    y2="0"
                >
                    <stop offset="0%" stopColor="var(--base1)" />
                    <stop offset="35%" stopColor="var(--base2)" />
                    {(variant === 'animated' || variant === 'animated-icon') && (
                        <stop offset="50%" stopColor="var(--highlight)">
                            <animate
                                attributeName="offset"
                                values="-1;1"
                                dur="1.8s"
                                repeatCount="indefinite"
                            />
                        </stop>
                    )}
                    {(variant !== 'animated' && variant !== 'animated-icon') && (
                        <stop offset="50%" stopColor="var(--highlight)" />
                    )}
                    <stop offset="65%" stopColor="var(--base2)" />
                    <stop offset="100%" stopColor="var(--base1)" />
                </linearGradient>
            </defs>

            {/* ICON */}
            <g transform="translate(0,-2)">
                <rect x="40" y="42" width="40" height="8" rx="4" fill="url(#oceanSkeleton)" />
                <rect x="30" y="56" width="60" height="8" rx="4" fill="url(#oceanSkeleton)" />
                <rect x="26" y="70" width="68" height="8" rx="4" fill="url(#oceanSkeleton)" />
                <rect x="30" y="84" width="60" height="8" rx="4" fill="url(#oceanSkeleton)" />
                <rect x="40" y="98" width="40" height="8" rx="4" fill="url(#oceanSkeleton)" />
            </g>

            {/* TEXT */}
            {effectiveShowText && (
                <text
                    x="118"
                    y="92"
                    fontFamily="Inter, system-ui, sans-serif"
                    fontSize="44"
                    fontWeight="600"
                    letterSpacing="-0.55"
                    fill="var(--text)"
                >
                    OnThesis
                </text>
            )}
        </svg>
    );
}
