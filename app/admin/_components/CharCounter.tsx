"use client";

import { useState } from "react";

export function CharCounter({
  name,
  max,
  defaultValue = "",
  rows = 7,
  placeholder,
  className = "vw-textarea",
  labelId,
}: {
  name: string;
  max: number;
  defaultValue?: string;
  rows?: number;
  placeholder?: string;
  className?: string;
  labelId?: string;
}) {
  const [value, setValue] = useState(defaultValue);

  return (
    <>
      <textarea
        id={labelId}
        className={className}
        name={name}
        rows={rows}
        maxLength={max}
        value={value}
        placeholder={placeholder}
        onChange={(event) => setValue(event.target.value)}
      />
      <span className="vw-hint">
        {value.length.toLocaleString()} / {max.toLocaleString()} characters. Only shown here — never sent to the enquirer.
      </span>
    </>
  );
}
