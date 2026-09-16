'use client'

import Image from 'next/image'

interface UserAvatarProps {
  name?: string | null
  color?: string
  image?: string | null
  size?: number
  className?: string
}

/** Returns initials from a full name */
function getInitials(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

/**
 * UserAvatar — shows real profile photo if available, else colored initials.
 * Used in sidebar, header, notes, leads, etc.
 */
export function UserAvatar({ name, color = '#4f7ef8', image, size = 32, className = '' }: UserAvatarProps) {
  const initials = name ? getInitials(name) : '?'
  const fontSize = Math.max(8, Math.floor(size * 0.34))

  return (
    <span
      className={`inline-flex items-center justify-center rounded-[4px] overflow-hidden flex-shrink-0 font-semibold text-white select-none ring-1 ring-white/10 ${className}`}
      style={{
        width: size,
        height: size,
        minWidth: size,
        minHeight: size,
        background: image ? '#181f33' : color,
        fontSize,
      }}
      title={name ?? ''}
    >
      {image ? (
        <img
          src={image}
          alt={name ?? 'Avatar'}
          className="object-cover object-top w-full h-full"
        />
      ) : (
        initials
      )}
    </span>
  )
}
