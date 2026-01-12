export interface Building{
    id: string,
    status?: string,
    code: string,
    name: string,
    address?: string,
    floorsMax: number,
    totalApartmentsAll: number,
    totalApartmentsActive: number,
    createdBy?: string,
    createdAt?: string
}
