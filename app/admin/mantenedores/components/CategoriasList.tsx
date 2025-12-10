"use client";

import { useState, useEffect } from "react";

interface Categoria {
    id: number;
    codigo: string;
    nombre: string;
    descripcion: string | null;
    puntos_fidelidad: number;
    activo: boolean;
}

export default function CategoriasList() {
    const [categorias, setCategorias] = useState<Categoria[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchCategorias();
    }, []);

    const fetchCategorias = async () => {
        try {
            const token = localStorage.getItem("access_token");
            const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/maestras/categorias`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });

            if (response.ok) {
                const data = await response.json();
                setCategorias(data);
            }
        } catch (error) {
            console.error("Error cargando categorías:", error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return <div className="text-center py-4">Cargando...</div>;
    }

    return (
        <div className="space-y-4">
            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Código
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Nombre
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Descripción
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Puntos
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Estado
                            </th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {categorias.map((categoria) => (
                            <tr key={categoria.id}>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-mono">
                                    {categoria.codigo}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                    {categoria.nombre}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                    {categoria.descripcion || "-"}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                    {categoria.puntos_fidelidad}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <span
                                        className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${categoria.activo
                                                ? "bg-green-100 text-green-800"
                                                : "bg-gray-100 text-gray-800"
                                            }`}
                                    >
                                        {categoria.activo ? "Activo" : "Inactivo"}
                                    </span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            {categorias.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                    No hay categorías registradas
                </div>
            )}
        </div>
    );
}
