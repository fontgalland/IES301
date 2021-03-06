import { object, string, number } from 'yup';
import Plan from '../models/Plan';

class PlanController {
  async store(req, res) {
    const schema = object().shape({
      title: string().required(),
      duration: number()
        .required()
        .integer(),
      price: number()
        .required()
        .positive(),
    });

    if (!(await schema.isValid(req.body))) {
      return res.status(400).json({ error: 'Falha na validação' });
    }

    const planExists = await Plan.findOne({ where: { title: req.body.title } });

    if (planExists)
      return res.status(400).json({ error: 'Esse plano já existe! Cadastre um novo plano' });

    const { id } = await Plan.create(req.body);

    return res.json({
      id,
    });
  }

  async index(req, res) {
    const plans = await Plan.findAll();

    return res.json(plans);
  }

  async show(req, res) {
    const { id } = req.params;

    const plan = await Plan.findByPk(id);

    return res.json(plan);
  }

  async update(req, res) {
    const schema = object().shape({
      title: string().required(),
      duration: number()
        .integer()
        .required(),
      price: number()
        .positive()
        .required(),
    });

    if (!(await schema.isValid(req.body))) {
      return res.status(400).json({ error: 'validation fails' });
    }

    const plan = await Plan.findByPk(req.params.id);

    if (!plan) {
      return res.status(401).json({
        error: 'Plano não existe',
      });
    }

    const { title } = req.body;

    if (title && title !== plan.title) {
      const checkTitle = await Plan.findOne({
        where: { title },
      });

      if (checkTitle) {
        return res.status(401).json({
          error: 'Titulo do plano deve ser único',
        });
      }
    }

    const { duration, price } = await plan.update(req.body);

    return res.json({
      title,
      duration,
      price,
    });
  }

  async delete(req, res) {
    const plan = await Plan.findByPk(req.params.id);

    if (!plan) {
      return res.status(400).json({ error: 'Plano não encontrado' });
    }

    await plan.destroy();

    return res.status(204).send();
  }
}

export default new PlanController();
