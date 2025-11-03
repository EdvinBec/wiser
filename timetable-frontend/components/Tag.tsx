export interface Props {
  variant: "lecture" | "compExercise" | "labExcercise" | "seminarExcercise";
}

export function Tag({ variant }: Props) {
  if (variant == "lecture") {
    return (
      <div
        className={`px-3 py-1 flex gap-1 items-center rounded-sm bg-lecture border border-gray-300`}
      >
        <div
          className={`w-1.5 h-1.5 md:w-2 md:h-2 rounded-full bg-lecture-text`}
        />
        <span className={`capitalize text-[10px] md:text-xs text-lecture-text`}>
          Predavanje
        </span>
      </div>
    );
  } else if (variant == "compExercise") {
    return (
      <div
        className={`text-sm px-3 py-1 flex gap-1 items-center rounded-sm bg-compExercise border border-gray-300`}
      >
        <div
          className={`w-1.5 h-1.5 md:w-2 md:h-2 rounded-full bg-compExercise-text`}
        />
        <span
          className={`capitalize text-[10px] md:text-xs text-compExercise-text`}
        >
          Računalniške vaje
        </span>
      </div>
    );
  } else if (variant == "labExcercise") {
    return (
      <div
        className={`text-sm px-3 py-1 flex gap-1 items-center rounded-sm bg-labExcercise border border-gray-300`}
      >
        <div
          className={`w-1.5 h-1.5 md:w-2 md:h-2 rounded-full bg-labExcercise-text`}
        />
        <span
          className={`capitalize text-[10px] md:text-xs text-labExcercise-text`}
        >
          Labaratorijske vaje
        </span>
      </div>
    );
  } else if (variant == "seminarExcercise") {
    return (
      <div
        className={`text-sm px-3 py-1 flex gap-1 items-center rounded-sm bg-seminarExcercise border border-gray-300`}
      >
        <div
          className={`w-1.5 h-1.5 md:w-2 md:h-2 rounded-full bg-seminarExcercise-text`}
        />
        <span
          className={`capitalize text-[10px] md:text-xs text-seminarExcercise-text`}
        >
          Seminarske vaja
        </span>
      </div>
    );
  }

  return (
    <div
      className={`text-sm px-3 py-1 flex gap-1 items-center rounded-sm bg-gray-200 border-gray-400`}
    >
      <div className={`w-1.5 h-1.5 md:w-2 md:h-2 rounded-full bg-gray-800`} />
      <span className={`capitalize text-[10px] md:text-xs text-gray-800`}>
        Other
      </span>
    </div>
  );
}
