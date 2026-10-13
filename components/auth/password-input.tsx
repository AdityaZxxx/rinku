"use client";

import { useState } from "react";
import { EyeIcon, EyeSlashIcon } from "@phosphor-icons/react";

import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/components/ui/input-group";

/**
 * Shared by the auth and settings forms, so the reveal state and accessible naming live in one place.
 */
export function PasswordInput({
  id,
  name,
  value,
  onChange,
  onBlur,
  invalid,
  describedBy,
  autoComplete,
}: {
  id: string;
  name: string;
  value: string;
  onChange: (value: string) => void;
  onBlur: () => void;
  invalid: boolean;
  describedBy?: string;
  autoComplete: string;
}) {
  const [revealed, setRevealed] = useState(false);

  return (
    <InputGroup>
      <InputGroupInput
        id={id}
        name={name}
        type={revealed ? "text" : "password"}
        value={value}
        onBlur={onBlur}
        onChange={(event) => onChange(event.target.value)}
        aria-invalid={invalid}
        aria-describedby={describedBy}
        autoComplete={autoComplete}
      />
      <InputGroupAddon align="inline-end">
        {/* 24px is tight on touch: an invisible pseudo-element widens the tap area to 36px. */}
        <InputGroupButton
          className="relative after:absolute after:-inset-1.5 after:content-['']"
          onClick={() => setRevealed((current) => !current)}
          aria-label={revealed ? "Hide password" : "Show password"}
          aria-pressed={revealed}
        >
          {revealed ? (
            <EyeSlashIcon aria-hidden="true" className="size-4" />
          ) : (
            <EyeIcon aria-hidden="true" className="size-4" />
          )}
        </InputGroupButton>
      </InputGroupAddon>
    </InputGroup>
  );
}
