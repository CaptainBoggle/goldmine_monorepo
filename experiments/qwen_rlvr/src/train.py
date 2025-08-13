import verifiers as vf
from environment import get_hpo_environment

env = get_hpo_environment()

model_name = "willcb/Qwen3-0.6B"
model, tokenizer = vf.get_model_and_tokenizer(model_name)
run_name = "math-grpo_" + model_name.split("/")[-1].lower()

training_args = vf.grpo_defaults(run_name=run_name)
training_args.per_device_train_batch_size = 4
training_args.num_generations = 8
training_args.gradient_accumulation_steps = 32
training_args.num_iterations = 1
training_args.max_prompt_length = 256
training_args.max_completion_length = 512
training_args.save_steps = 25
training_args.max_steps = 100
training_args.max_concurrent = 256

trainer = vf.GRPOTrainer(
    model=model,
    processing_class=tokenizer,
    env=env,
    args=training_args,
)
trainer.train()
