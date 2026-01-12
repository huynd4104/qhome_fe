interface RequestInfoProps {
    title: string;
    value: string;
    isHighlighted?: boolean;
}

const InfoRow = ({ value, title, isHighlighted } : RequestInfoProps) => (
    <div className="flex justify-between py-1">
        <span className="text-[#024023] font-bold mb-1">{title}:</span>
        <div className={`${isHighlighted ? "text-[#14AE5C]" : "text-[#024023]"} font-semibold whitespace-pre-wrap break-words`}>{value}</div>
    </div>
);

export default InfoRow;
