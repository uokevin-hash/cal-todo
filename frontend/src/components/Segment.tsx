type Props<T extends string | number> = {
  name: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
};

// 9-style-guide 5.3: 숨긴 라디오 + 버튼 모양 라벨
export function Segment<T extends string | number>({ name, value, options, onChange }: Props<T>) {
  return (
    <span className="segment" role="radiogroup">
      {options.map((option) => (
        <label key={option.value} className={option.value === value ? 'selected' : ''}>
          <input
            type="radio"
            name={name}
            checked={option.value === value}
            onChange={() => onChange(option.value)}
          />
          {option.label}
        </label>
      ))}
    </span>
  );
}
