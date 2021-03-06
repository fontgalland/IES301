import { object, date, number, string } from 'yup';
import { addMonths, parseISO, isBefore, isAfter, endOfDay } from 'date-fns';
import Membership from '../models/Membership';
import Plan from '../models/Plan';
import Student from '../models/Student';

import ConfirmationMail from '../jobs/ConfirmationMail';
import Queue from '../../lib/Queue';

class MembershipController {
  async store(req, res) {
    const schema = object().shape({
      start_date: date().required(),
      plan_id: number().required(),
      student_id: number().required(),
    });

    if (!(await schema.isValid(req.body))) {
      return res.status(400).json({ error: 'validation fails' });
    }

    const { start_date, plan_id, student_id } = req.body;
    const parsedStartDate = parseISO(start_date);

    const checkPlanExists = await Plan.findByPk(plan_id);

    if (!checkPlanExists) {
      return res.status(401).json({ error: 'Plano não encontrado' });
    }

    const checkStudentExists = await Student.findByPk(student_id);

    if (!checkStudentExists) {
      return res.status(401).json({ error: 'Aluno não encontrado' });
    }

    const checkStudentHasMembership = await Membership.findOne({
      where: {
        student_id,
      },
    });

    if (
      checkStudentHasMembership &&
      (checkStudentHasMembership.active ||
        isAfter(
          endOfDay(checkStudentHasMembership.start_date),
          endOfDay(new Date())
        ))
    ) {
      return res
        .status(400)
        .json({ error: 'Aluno já tem uma matricula ativa.' });
    }

    if (isBefore(endOfDay(parsedStartDate), new Date())) {
      return res.status(400).json({ error: 'Datas passadas não são permitidas' });
    }

    const end_date = addMonths(parsedStartDate, checkPlanExists.duration);
    const price = checkPlanExists.price * checkPlanExists.duration;

    const membership = await Membership.create({
      student_id,
      plan_id,
      start_date: parsedStartDate,
      end_date,
      price,
    });

    const membershipInfo = await Membership.findByPk(membership.id, {
      include: [
        {
          model: Student,
          as: 'student',
          attributes: ['id', 'name', 'email'],
        },
        {
          model: Plan,
          as: 'plan',
          attributes: ['title'],
        },
      ],
    });

    if (process.env.NODE_ENV !== 'test') {
      await Queue.add(ConfirmationMail.key, {
        membershipInfo,
      });
    }

    return res.json(membership);
  }

  async index(req, res) {
    const { page = 1 } = req.query;

    const { count, rows: memberships } = await Membership.findAndCountAll({
      order: ['id'],
      limit: 10,
      offset: (page - 1) * 10,
      attributes: [
        'id',
        'start_date',
        'end_date',
        'price',
        'active',
        'student_id',
        'plan_id',
      ],
      include: [
        {
          model: Student,
          as: 'student',
          attributes: ['name'],
        },
        {
          model: Plan,
          as: 'plan',
          attributes: ['title'],
        },
      ],
    });

    return res.json({ memberships, count });
  }

  async show(req, res) {
    const { studentId } = req.params;

    const membership = await Membership.findOne({
      where: {
        student_id: studentId,
      },

      include: [
        {
          model: Student,
          as: 'student',
          attributes: ['name'],
        },
        {
          model: Plan,
          as: 'plan',
          attributes: ['title', 'duration'],
        },
      ],
    });

    return res.json(membership);
  }

  async update(req, res) {
    const schema = object().shape({
      start_date: string().required(),
      plan_id: number().required(),
    });

    const { studentId } = req.params;

    if (!(await schema.isValid(req.body))) {
      return res.status(400).json({ error: 'validation fails' });
    }

    const { start_date, plan_id } = req.body;
    const parsedStartDate = parseISO(start_date);

    /**
     * Search for the student membership
     */
    const membership = await Membership.findOne({
      where: {
        student_id: studentId,
      },
    });

    if (!membership) {
      return res
        .status(400)
        .json({ error: 'Aluno não tem matrícula ativa' });
    }

    if (membership.active) {
      return res
        .status(400)
        .json({ error: 'Apenas matriculas inativas podem ser atualizadas' });
    }

    if (start_date && isBefore(endOfDay(parsedStartDate), new Date())) {
      return res.status(400).json({ error: 'Datas passadas não são permitidas' });
    }

    const checkPlanExists = await Plan.findByPk(plan_id);

    if (!checkPlanExists) {
      return res.status(401).json({ error: 'Plano não encontrado' });
    }

    const end_date = addMonths(parsedStartDate, checkPlanExists.duration);
    const price = checkPlanExists.price * checkPlanExists.duration;

    const updatedMembership = await membership.update({
      student_id: studentId,
      plan_id,
      start_date: parsedStartDate,
      end_date,
      price,
    });

    return res.json(updatedMembership);
  }

  async delete(req, res) {
    const { studentId } = req.params;

    const membership = await Membership.findOne({
      where: {
        student_id: studentId,
      },
    });

    if (!membership) {
      return res.status(400).json({ error: 'Matricula de aluno não encontrada' });
    }

    await membership.destroy();

    return res.status(204).send();
  }
}

export default new MembershipController();
