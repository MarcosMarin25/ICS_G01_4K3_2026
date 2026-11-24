// Stub (Meszaros): responde si un usuario está registrado a partir de una lista fija.
class RepositorioUsuariosFalso {
  constructor(usuariosRegistrados) {
    this.usuariosRegistrados = usuariosRegistrados;
  }

  estaRegistrado(usuario) {
    return this.usuariosRegistrados.includes(usuario);
  }
}

module.exports = RepositorioUsuariosFalso;
