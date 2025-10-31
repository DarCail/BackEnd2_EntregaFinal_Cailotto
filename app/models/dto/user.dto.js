export class UserDTO {
    constructor(user) {
        this._id = user._id;
        this.fullName = `${user.first_name} ${user.last_name}`;
        this.email = user.email;
        this.role = user.role;
        // Omitimos información sensible como password, y otros campos que no son necesarios
        // También podemos agregar campos calculados o transformados
    }

    // Método estático para convertir un usuario a DTO
    static fromModel(user) {
        if (!user) return null;
        return new UserDTO(user);
    }
}
