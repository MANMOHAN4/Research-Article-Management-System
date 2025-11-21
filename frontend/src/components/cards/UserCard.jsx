import { Settings } from 'lucide-react';

const UserCard = ({ user, onEdit, onDelete }) => {
  return (
    <div className="card hover:shadow-md transition-shadow">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-lg flex items-center justify-center text-white"
             style={{ background: 'linear-gradient(135deg, #30cfd0 0%, #330867 100%)' }}>
          <Settings className="w-5 h-5" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="font-semibold text-gray-900 truncate">{user.Username}</h3>
          <p className="text-sm text-gray-600 truncate">{user.Email}</p>
          <div className="mt-2">
            <span className="px-2 py-1 rounded bg-blue-100 text-blue-700 text-xs">{user.Role}</span>
          </div>
        </div>
      </div>
      <div className="mt-4 flex items-center justify-end gap-2">
        <button onClick={() => onEdit?.(user)} className="btn btn-secondary">Edit</button>
        <button onClick={() => onDelete?.(user.UserID)} className="btn btn-danger">Delete</button>
      </div>
    </div>
  );
};

export default UserCard;
