import { useNavigate } from "react-router-dom";

export function BackButton({ className }: { className: string }) {
  const navigate = useNavigate();

  return (
    <button
      className={className}
      type="button"
      onClick={() => {
        if (window.history.state?.idx > 0) navigate(-1);
        else navigate("/");
      }}
    >
      ← 返回上一页
    </button>
  );
}
