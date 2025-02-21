import { Button } from "@nextui-org/button";
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalFooter,
} from "@nextui-org/modal";
import { useMutation, useQuery } from "convex/react";
import { z } from "zod";
import { SubmitHandler, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { CompanyModalButton, CompanyModalFields } from "./elements";

import { api } from "@/convex/_generated/api";
import { Company } from "@/types";
import { scanCompany } from "@/app/helpers";

const schema = z.object({
  name: z.string().min(1, { message: "Company name is required" }),
  careerPage: z.string().url(),
  keyword: z.string().min(1, { message: "Career page keyword is required" }),
  website: z.string().url(),
});

export type CompanyFormFields = z.infer<typeof schema>;

interface CompanyModalProps {
  company?: Company;
  isOpen: boolean;
  onOpen: () => void;
  onClose: () => void;
  onOpenChange: () => void;
}

export default function CompanyModal({
  company,
  isOpen,
  onOpen,
  onClose,
  onOpenChange,
}: CompanyModalProps) {
  const defaultValues = {
    name: company?.name || "",
    careerPage: company?.careerPage || "",
    keyword: company?.keyword || "",
    website: company?.website || "",
  };

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CompanyFormFields>({
    defaultValues,
    resolver: zodResolver(schema),
  });

  const jobTitles = useQuery(api.users.getJobTitles) || [];
  const companies = useQuery(api.companies.get);
  const updateCompany = useMutation(api.companies.update);
  const createCompany = useMutation(api.companies.create);
  const setIsScanningCompany = useMutation(api.companies.setIsScanningCompany);

  const onSubmit: SubmitHandler<CompanyFormFields> = async (formData) => {
    const { name, keyword, website, careerPage } = formData;

    let currentCompany;

    if (company) {
      currentCompany = { ...company, ...formData };
      await updateCompany({ company: currentCompany });

      reset({
        name: currentCompany?.name || "",
        careerPage: currentCompany?.careerPage || "",
        keyword: currentCompany?.keyword || "",
        website: currentCompany?.website || "",
      });
    } else {
      currentCompany = await createCompany({
        name,
        keyword,
        careerPage,
        website,
      });

      reset(defaultValues);
    }

    const toastSuccessMessage = company
      ? `Information for ${formData.name} updated successfully!`
      : `Finished scanning for jobs on ${currentCompany.name}`;

    onClose();

    await scanCompany({
      company: currentCompany,
      jobTitles,
      setIsScanningCompany,
      updateCompany,
      toastSuccessMessage,
      toastErrorMessage: `An error occurred while scanning for jobs on ${formData.name}. Please try again!`,
    });
  };

  return (
    <>
      {!company && (
        <CompanyModalButton
          isHighlighted={!companies?.length}
          onOpen={onOpen}
        />
      )}

      <Modal
        backdrop="blur"
        isOpen={isOpen}
        placement="top-center"
        onOpenChange={onOpenChange}
      >
        <ModalContent>
          {() => (
            <>
              <ModalHeader className="flex flex-col gap-1 text-2xl">
                {company ? "Edit company" : "Add new company"}
              </ModalHeader>
              <form onSubmit={handleSubmit(onSubmit)}>
                <CompanyModalFields errors={errors} register={register} />
                <ModalFooter>
                  <Button color="danger" variant="flat" onPress={onClose}>
                    Close
                  </Button>
                  <Button
                    color="success"
                    isDisabled={isSubmitting}
                    isLoading={isSubmitting}
                    type="submit"
                  >
                    {company ? "Save" : "Add"}
                  </Button>
                </ModalFooter>
              </form>
            </>
          )}
        </ModalContent>
      </Modal>
    </>
  );
}
