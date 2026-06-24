import express from 'express';
import { usuarioController } from '../controllers/usuarioController.js';
import { authMiddleware } from '../middleware/authMiddleware.js';
import { permissionMiddleware } from '../middleware/permissionMiddleware.js';

export const usuarioRoutes = express.Router();

// Aplica autenticação geral para todas as rotas de usuários
usuarioRoutes.use(authMiddleware);

// Qualquer usuário autenticado pode alterar a sua própria senha
usuarioRoutes.put('/:id/alterar-senha', usuarioController.alterarSenha);

// Rotas exclusivas de administrador
const adminOnly = permissionMiddleware(['ADMIN']);

usuarioRoutes.get('/', adminOnly, usuarioController.listar);
usuarioRoutes.post('/', adminOnly, usuarioController.criar);
usuarioRoutes.put('/:id', adminOnly, usuarioController.atualizar);
usuarioRoutes.delete('/:id', adminOnly, usuarioController.excluir);

usuarioRoutes.put('/:id/resetar-senha', adminOnly, usuarioController.resetarSenhaForcado);
usuarioRoutes.put('/:id/status', adminOnly, usuarioController.alterarStatus);
usuarioRoutes.get('/auditoria/logs', adminOnly, usuarioController.listarLogs);
