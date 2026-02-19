import toast from 'react-hot-toast';
import { OnThesisLogo } from '../components/ui/OnThesisLogo';
import { CheckCircle2, XCircle } from 'lucide-react';

export const customToast = {
    success: (message: string) => {
        toast.custom((t) => (
            <div
                className={`${t.visible ? 'animate-enter' : 'animate-leave'
                    } max-w-md w-full bg-white dark:bg-[#1e293b] border border-green-500/20 shadow-lg rounded-2xl pointer-events-auto flex ring-1 ring-black ring-opacity-5`}
            >
                <div className="flex-1 w-0 p-4">
                    <div className="flex items-start">
                        <div className="flex-shrink-0 pt-0.5">
                            <div className="h-10 w-10 relative">
                                <OnThesisLogo variant="icon-only" className="w-10 h-10 absolute inset-0 opacity-20" showText={false} />
                                <CheckCircle2 className="h-6 w-6 text-green-500 absolute inset-0 m-auto" />
                            </div>
                        </div>
                        <div className="ml-3 flex-1">
                            <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                Berhasil!
                            </p>
                            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                                {message}
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        ), { duration: 3000 });
    },

    error: (message: string) => {
        toast.custom((t) => (
            <div
                className={`${t.visible ? 'animate-enter' : 'animate-leave'
                    } max-w-md w-full bg-white dark:bg-[#1e293b] border border-red-500/20 shadow-lg rounded-2xl pointer-events-auto flex ring-1 ring-black ring-opacity-5`}
            >
                <div className="flex-1 w-0 p-4">
                    <div className="flex items-start">
                        <div className="flex-shrink-0 pt-0.5">
                            <XCircle className="h-10 w-10 text-red-500/80" />
                        </div>
                        <div className="ml-3 flex-1">
                            <p className="text-sm font-medium text-red-900 dark:text-red-100">
                                Terjadi Kesalahan
                            </p>
                            <p className="mt-1 text-sm text-red-500 dark:text-red-400">
                                {message}
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        ));
    },

    loading: (message: string) => {
        return toast.custom((t) => (
            <div
                className={`${t.visible ? 'animate-enter' : 'animate-leave'
                    } max-w-md w-full bg-white dark:bg-[#1e293b] border border-indigo-500/20 shadow-lg rounded-2xl pointer-events-auto flex ring-1 ring-black ring-opacity-5`}
            >
                <div className="flex-1 w-0 p-4">
                    <div className="flex items-center">
                        <div className="flex-shrink-0">
                            <OnThesisLogo variant="animated-icon" className="w-12 h-12" showText={false} />
                        </div>
                        <div className="ml-3 flex-1">
                            <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                Memproses...
                            </p>
                            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                                {message}
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        ), { duration: Infinity });
    },

    dismiss: (toastId?: string) => toast.dismiss(toastId)
};
