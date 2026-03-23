import { useState } from 'react';
import { md5hex } from '../../utils/md5';

interface AvatarProps {
  name: string;
  email: string;
  size?: number;
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

export function Avatar({ name, email, size = 36 }: AvatarProps) {
  const [failed, setFailed] = useState(false);
  const hash = md5hex(email.trim().toLowerCase());
  const gravatarUrl = `https://www.gravatar.com/avatar/${hash}?d=404&s=${size * 2}`;

  if (!failed) {
    return (
      <img
        src={gravatarUrl}
        alt={name}
        width={size}
        height={size}
        className="avatar"
        style={{ objectFit: 'cover' }}
        onError={() => setFailed(true)}
      />
    );
  }

  return (
    <div className="avatar" style={{ width: size, height: size, fontSize: size * 0.38 }}>
      {initials(name)}
    </div>
  );
}
